import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import yauzl from "yauzl";

import { getTemplateManifest } from "../templates/registry";
import type {
  PageBlockInput,
  SupportedPageOverride,
  TemplatePresetOverrides,
} from "../templates/types";
import { ApiRequestError } from "./apiErrors";
import { writeAuditLog } from "./auditLog";
import { getTemplateDetail, publishCustomTemplate } from "./templateCatalog";
import { validateTemplatePresetOverrides } from "./templatePresets";
import { getUploadsDir } from "./uploadStorage";

type ImportReport = {
  source: "react-vite";
  importer: "blit-studio-v1";
  originalFilename: string;
  detectedRoot: string;
  routes: Array<{ path: string; pageKey: string; component: string }>;
  mappedPages: string[];
  mappedSections: string[];
  copiedAssets: Array<{ source: string; url: string }>;
  unsupportedComponents: string[];
  warnings: string[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function block(id: string, type: string, data: Record<string, unknown>): PageBlockInput {
  return { id, type, data };
}

function mimeTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walkDirectories(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const children = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const child = path.join(root, entry.name);
        return [child, ...(await walkDirectories(child))];
      })
  );

  return children.flat();
}

async function findViteReactRoot(extractDir: string) {
  const candidates = [extractDir, ...(await walkDirectories(extractDir))];
  for (const candidate of candidates) {
    if (
      (await pathExists(path.join(candidate, "package.json"))) &&
      (await pathExists(path.join(candidate, "src", "App.tsx")))
    ) {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(candidate, "package.json"), "utf8")
      ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {}),
      };
      if (deps.vite && deps.react) {
        return candidate;
      }
    }
  }

  return null;
}

function extractZip(zipPath: string, destination: string) {
  return new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openError, zipfile) => {
      if (openError || !zipfile) {
        reject(openError ?? new Error("Could not open zip."));
        return;
      }

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const normalized = path.normalize(entry.fileName);
        if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
          zipfile.close();
          reject(new Error("Zip contains unsafe paths."));
          return;
        }

        const target = path.resolve(destination, normalized);
        if (!target.startsWith(path.resolve(destination))) {
          zipfile.close();
          reject(new Error("Zip contains unsafe paths."));
          return;
        }

        if (/\/$/.test(entry.fileName)) {
          fs.mkdir(target, { recursive: true })
            .then(() => zipfile.readEntry())
            .catch(reject);
          return;
        }

        zipfile.openReadStream(entry, (streamError, readStream) => {
          if (streamError || !readStream) {
            reject(streamError ?? new Error("Could not read zip entry."));
            return;
          }

          fs.mkdir(path.dirname(target), { recursive: true })
            .then(async () => {
              const writeStream = (await import("fs")).createWriteStream(target);
              readStream.pipe(writeStream);
              writeStream.on("finish", () => zipfile.readEntry());
              writeStream.on("error", reject);
            })
            .catch(reject);
        });
      });
      zipfile.on("end", () => resolve());
      zipfile.on("error", reject);
    });
  });
}

function discoverRoutes(appSource: string) {
  const routes: Array<{ path: string; pageKey: string; component: string }> = [];
  const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z0-9_]+)\s*\/>\}/g;
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(appSource))) {
    const routePath = match[1];
    const component = match[2];
    routes.push({
      path: routePath,
      pageKey: routePath === "/" ? "home" : slugify(routePath.replace(/^\//, "")),
      component,
    });
  }
  return routes;
}

async function copyBundleAssets(appRoot: string, baseUrl: string) {
  const assetsDir = path.join(appRoot, "public", "assets");
  const assetMap = new Map<string, string>();
  const copiedAssets: ImportReport["copiedAssets"] = [];

  if (!(await pathExists(assetsDir))) {
    return { assetMap, copiedAssets };
  }

  const uploadsDir = getUploadsDir();
  await fs.mkdir(uploadsDir, { recursive: true });
  const files = await fs.readdir(assetsDir);

  for (const filename of files) {
    const source = path.join(assetsDir, filename);
    const stat = await fs.stat(source);
    if (!stat.isFile()) {
      continue;
    }

    const nextName = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}-${filename}`;
    const target = path.join(uploadsDir, nextName);
    await fs.copyFile(source, target);

    const publicSource = `/assets/${filename}`;
    const url = `${baseUrl}/uploads/${nextName}`;
    assetMap.set(publicSource, url);
    copiedAssets.push({ source: publicSource, url });
  }

  return { assetMap, copiedAssets };
}

function rewriteAsset(assetMap: Map<string, string>, value: string) {
  return assetMap.get(value) ?? value;
}

function blitProjects(assetMap: Map<string, string>) {
  const image = (src: string) => rewriteAsset(assetMap, src);
  const echoesHref = "/work/echoes-living-installation";
  const worksHref = (id: string) => `/works#${id}`;
  return {
    featuredProjects: [
      {
        id: "echoes",
        title: "ECHOES",
        category: "Installation · Interactive art",
        year: "2025",
        description:
          "Echoes is an evolving installation that captures and amplifies the pulse of the festival.",
        image: image("/assets/echoes_installation.jpg"),
        location: "Merida, Mexico",
        href: echoesHref,
      },
      {
        id: "bmw",
        title: "BMW - C3",
        category: "Opening Ceremony · Reactive Dance",
        year: "2022",
        description:
          "A bold dual-show experience. Live interactive performance meets the electrifying reveal of the new BMW i7.",
        image: image("/assets/bmw_event.jpg"),
      },
    ],
    allProjects: [
      {
        id: "zayed",
        title: "Zayed Sustainability Prize",
        category: "Immersive Installation",
        labels: ["Immersive Installation"],
        year: "2024",
        description:
          "Inside an immersive dome at Masdar City, a sensory installation brings the global mission of the Zayed Sustainability Prize to life.",
        image: image("/assets/zayed_dome.jpg"),
        href: worksHref("zayed"),
      },
      {
        id: "fantastic",
        title: "The Fantastic Library of Beasts",
        category: "VR Experience",
        labels: ["VR Experience"],
        year: "2024",
        description:
          "A glimpse into the medieval imagination, a universe of fantasy, epic tales, and creatures.",
        image: image("/assets/hero_bust.jpg"),
        href: worksHref("fantastic"),
      },
      { id: "echoes", title: "ECHOES Living Installation", category: "Installation · Interactive art", year: "2025", description: "Echoes is an evolving installation that captures and amplifies the pulse of the festival.", image: image("/assets/echoes_installation.jpg"), href: echoesHref },
      {
        id: "games",
        title: "Games of the Small States of Europe",
        category: "Digital Scenography",
        labels: ["Digital Scenography"],
        year: "2023",
        description:
          "A minimalist graphic visual journey crafted to bring the performances to life.",
        image: image("/assets/santander_event.jpg"),
        href: worksHref("games"),
      },
      {
        id: "dataism",
        title: "Data-Ism",
        category: "Immersive Installation",
        labels: ["Immersive Installation"],
        year: "2023",
        description:
          "Data-ism is an artistic installation that explores the narrowing gap between the natural and digital realms.",
        image: image("/assets/data_ism_installation.jpg"),
        href: worksHref("dataism"),
      },
      { id: "bmw", title: "BMW - C3 partner convention", category: "Opening Ceremony · Reactive Dance", year: "2022", description: "A bold dual-show experience. Live interactive performance meets the electrifying reveal of the new BMW i7.", image: image("/assets/bmw_event.jpg") },
      {
        id: "mango",
        title: "Mango Behind the Fashion",
        category: "VR Experience",
        labels: ["VR Experience"],
        year: "2022",
        description:
          "Celebrating 40 Years of fashion, identity, innovation, and legacy, brought to life in Virtual Reality.",
        image: image("/assets/fashion_editorial.jpg"),
        href: worksHref("mango"),
      },
      {
        id: "modernisme",
        title: "Modernisme.0",
        category: "VR Experience",
        labels: ["VR Experience"],
        year: "2022",
        description:
          "An immersive experience that transports you to the heart of Catalan Modernism.",
        image: image("/assets/cosmic_portal.jpg"),
        href: worksHref("modernisme"),
      },
    ],
    galleryProjects: [
      { id: "santander", title: "Santander Universia Summit", subtitle: "Digital Scenography · Opening Show", image: image("/assets/santander_event.jpg") },
      { id: "highrisk", title: "Highrisk Challengers", subtitle: "Visual Performance", image: image("/assets/highrisk_performance.jpg") },
      { id: "dataism", title: "Data-Ism", subtitle: "Immersive Installation", image: image("/assets/data_ism_installation.jpg") },
      { id: "crown", title: "10th Anniversary of the Spanish Crown", subtitle: "Projection Mapping", image: image("/assets/zayed_dome.jpg") },
    ],
    articles: [
      { id: "1", title: "The Poetics of Digital Interference", date: "Dec 2024", image: image("/assets/hero_particles.jpg") },
      { id: "2", title: "Designing for the Immersive Age", date: "Nov 2024", image: image("/assets/echoes_installation.jpg") },
      { id: "3", title: "When Art Meets Algorithm", date: "Oct 2024", image: image("/assets/data_ism_installation.jpg") },
    ],
  };
}

function buildBlitPages(assetMap: Map<string, string>): SupportedPageOverride[] {
  const image = (src: string) => rewriteAsset(assetMap, src);
  const projects = blitProjects(assetMap);
  const pages = [
    {
      pageKey: "home",
      title: "Home",
      slug: "/",
      blocks: [
        block("blit-home-hero", "blitHeroCollage", {
          eyebrow: "Blit Studio",
          headline: "the intersection between design, art, and technology",
          caption: "Creative technology studio for immersive events and interactive storytelling.",
          images: [
            { imageUrl: image("/assets/hero_bust.jpg"), alt: "Bust sculpture" },
            { imageUrl: image("/assets/hero_particles.jpg"), alt: "Particles and light" },
            { imageUrl: image("/assets/echoes_installation.jpg"), alt: "Installation view" },
          ],
        }),
        block("blit-home-featured", "blitFeaturedWork", {
          heading: "featured work",
          title: "Selected projects",
          ctaLabel: "See all projects",
          ctaHref: "/works",
          projects: projects.featuredProjects,
        }),
        block("blit-home-editorial", "blitEditorialStatement", {
          eyebrow: "Studio statement",
          title: "We design emotional systems for spaces, brands, and audiences.",
          body: "Blit Studio creates high-impact visual experiences across immersive installations, ceremonies, VR, and digital scenography.",
        }),
        block("blit-home-video", "blitVideoSection", {
          videoUrl: image("/assets/hero_reel.mp4"),
          title: "Showreel",
        }),
        block("blit-home-capabilities", "blitCapabilitiesGrid", {
          heading: "capabilities",
          imageUrl: image("/assets/data_ism_installation.jpg"),
          items: [
            {
              title: "Immersive installations",
              description: "Interactive environments that connect story, space, and audience.",
              imageUrl: image("/assets/data_ism_installation.jpg"),
              imageAlt: "Immersive installation with a suspended light sphere",
            },
            {
              title: "Digital scenography",
              description: "Visual systems for ceremonies, events, and live performance.",
              imageUrl: image("/assets/bmw_event.jpg"),
              imageAlt: "Stage-scale digital scenography with radial light",
            },
            {
              title: "Virtual reality",
              description: "Designed experiences that transform perception and participation.",
              imageUrl: image("/assets/cosmic_portal.jpg"),
              imageAlt: "Immersive virtual reality environment",
            },
          ],
        }),
        block("blit-home-gallery", "blitHorizontalGallery", {
          heading: "selected moments",
          projects: projects.galleryProjects,
        }),
        block("blit-home-final", "blitFinalStatement", {
          title: "let's build the impossible carefully",
        }),
      ],
      seo: {
        seoTitle: "Blit Studio",
        seoDescription: "An immersive design and creative technology studio template.",
      },
    },
    {
      pageKey: "works",
      title: "Works",
      slug: "/works",
      blocks: [
        block("blit-works-index", "blitWorksIndex", {
          eyebrow: "selected works",
          heading: "works",
          moreTitle: "more works",
          listLabel: "selected works",
          filters: ["All", "Immersive Installation", "VR Experience", "Digital Scenography", "Projection Mapping"],
          projects: projects.allProjects,
        }),
      ],
      seo: {
        seoTitle: "Works - Blit Studio",
        seoDescription: "Selected immersive and creative technology projects.",
      },
    },
    {
      pageKey: "echoes-living-installation",
      title: "ECHOES Living Installation",
      slug: "/work/echoes-living-installation",
      blocks: [
        block("blit-echoes-hero", "blitCaseStudyHero", {
          eyebrow: "work",
          title: "ECHOES Living Installation",
          summary:
            "An evolving installation that turns the atmosphere, sound, and movement of the festival into a shared living memory.",
          year: "2025",
          category: "Installation",
          discipline: "Interactive art",
          location: "Merida, Mexico",
          projectLabel: "studio project",
          projectValue: "blit.Originals",
          partnerLabel: "soundscapes",
          partnerValue: "MATSU & joh.000_",
          primaryMediaUrl: image("/assets/hero_reel.mp4"),
          primaryMediaKind: "video",
          secondaryMediaUrl: image("/assets/echoes_installation.jpg"),
          secondaryMediaKind: "image",
          introBody:
            "Echoes reframes the festival as a responsive ecosystem where light, sound, and visual matter shift with the mood of the crowd.\n\nThe installation blends art, nature, and technology into a space that records each moment, then translates it into a collective experience visitors can return to and reshape together.",
        }),
        block("blit-echoes-highlights", "blitCaseStudyHighlights", {
          stories: [
            {
              title: "Echoing Connections.",
              body:
                "Real-time audio and environmental signals feed the piece, allowing the installation to answer back to the festival and become its active echo chamber.",
            },
            {
              title: "Interactive ecosystem.",
              body:
                "The room leans into a paradise-like mood, inviting visitors into an environment that becomes richer, denser, and more alive as participation grows.",
            },
            {
              title: "Invitation to Return.",
              body:
                "Live glimpses in the main venue tease the changing installation and encourage visitors to come back and witness how the experience evolves over time.",
            },
            {
              title: "A Place to Connect.",
              body:
                "Beyond spectacle, Echoes acts as a pause point for conversation, reflection, and recovery inside the tempo of the festival.",
            },
            {
              title: "Ambient evolution.",
              body:
                "Its atmosphere begins with a digital, electronic tension and slowly shifts into something softer and more organic as the event unfolds.",
            },
          ],
          media: [
            { src: image("/assets/echoes_installation.jpg"), kind: "image", alt: "ECHOES installation panorama" },
            { src: image("/assets/hero_particles.jpg"), kind: "image", alt: "Particle-based visual detail" },
            { src: image("/assets/data_ism_installation.jpg"), kind: "image", alt: "Suspended light sculpture" },
            { src: image("/assets/hero_reel.mp4"), kind: "video", alt: "Showreel excerpt" },
          ],
        }),
        block("blit-echoes-technical", "blitCaseStudyTechnical", {
          heading: "System logic",
          paragraphs: [
            "Plant leaves are fitted with electrodes that capture tiny electrical signals and route them through a custom Arduino-based device. Those living signals are translated into MIDI information that drives sound, light, and visual reactions across the room.",
            "At the same time, ambient microphones listen to the space. Visitor movement and nearby activity reshape the incoming audio, which is analyzed in real time for live visuals and also accumulated as a trace of how the audience changed the installation over the course of the festival.",
          ],
          media: [
            { src: image("/assets/data_ism_installation.jpg"), kind: "image", alt: "Interactive light sphere installation" },
            { src: image("/assets/wireframe_3d.jpg"), kind: "image", alt: "Wireframe system diagram" },
            { src: image("/assets/abstract_texture_bw.jpg"), kind: "image", alt: "Abstract monochrome texture" },
            { src: image("/assets/hero_particles.jpg"), kind: "image", alt: "Particle motion study" },
            { src: image("/assets/unfolded_hero.mp4"), kind: "video", alt: "Immersive motion clip" },
          ],
        }),
        block("blit-echoes-credits", "blitCaseStudyCredits", {
          heading: "The blit. team",
          team: [
            "Marc Alejandre",
            "Laia Claver",
            "Marc Colomines",
            "Paul Gonzalez",
            "Lucia Guarner",
            "Jose Luis Hernandez",
            "Steven Lesper",
            "Lara de la Puente",
            "Julio Cesar Romero",
            "Francesco Venturini",
          ],
        }),
      ],
      seo: {
        seoTitle: "ECHOES Living Installation - Blit Studio",
        seoDescription: "An immersive Blit case study page for the ECHOES living installation.",
      },
    },
    {
      pageKey: "studio",
      title: "Studio",
      slug: "/studio",
      blocks: [
        block("blit-studio-hero", "blitStudioHero", {
          title: "studio",
          subtitle: "A service-led creative technology studio.",
          imageUrl: image("/assets/tv_helmet_portrait.jpg"),
        }),
        block("blit-studio-intro", "blitStudioIntro", {
          kicker:
            "Since 2015, museums, cultural institutions, brands, and event creators have turned to blit. when the aim isn't simply to show something, but to shape how it's felt and how long it stays.",
          body:
            "from digital scenography and large-scale installations to interactive and virtual experiences, blit. designs situations where space, story, and presence collide and meaning appears through experiencing, not watching.",
        }),
        block("blit-studio-philosophy", "blitPhilosophy", {
          heading: "what drives us",
          body: "The studio sits between creative direction, technical production, and experiential design. Every brief is treated as a spatial condition: what people see, how they move, what they remember, and how long the feeling survives after the lights come up.",
        }),
        block("blit-studio-format", "blitFormatStatement", {
          title: "no format is too big, no challenge too complex.",
          body: "Alongside commissioned work, the studio authors blit.ORIGINALS, its own experiential platforms, not just one-off projects. Experiences like NOCTURNA, ECHOES, and PORTALIS are developed, owned, and evolved from within the studio, existing as ready-to-deploy platforms.",
          imageUrl: image("/assets/tv_helmet_portrait.jpg"),
        }),
        block("blit-studio-originals", "blitOriginals", {
          heading: "originals & formats",
          projects: [
            {
              id: "nocturna",
              title: "Nocturna",
              subtitle: "Immersive event platform",
              image: image("/assets/echoes_installation.jpg"),
              href: "/works",
            },
            {
              id: "echoes",
              title: "Echoes",
              subtitle: "Spatial audiovisual installation",
              image: image("/assets/data_ism_installation.jpg"),
              href: "/works",
            },
            {
              id: "portalis",
              title: "Portalis",
              subtitle: "Ready-to-deploy interactive format",
              image: image("/assets/cosmic_portal.jpg"),
              href: "/works",
            },
          ],
        }),
        block("blit-studio-image-statement", "blitStudioImageStatement", {
          title: "from studio floor to public memory",
          imageUrl: image("/assets/highrisk_performance.jpg"),
          body: "A working studio of artists, technologists, directors, producers, and systems thinkers.",
        }),
        block("blit-studio-team-statement", "blitTeamStatement", {
          title: "Some call it immersive. Others call it experiential. Audiences all say the same thing: It's the thing that stays with you.",
          team: [
            {
              name: "Marc Colomines",
              role: "Creative Managing Director",
              imageUrl: image("/assets/fashion_editorial.jpg"),
            },
            {
              name: "Lara de la Puente Aldea",
              role: "Motion designer & TouchDesigner Artist",
              imageUrl: image("/assets/highrisk_performance.jpg"),
            },
            {
              name: "Hector Mas",
              role: "Project Manager",
              imageUrl: image("/assets/zayed_dome.jpg"),
            },
          ],
        }),
        block("blit-studio-capabilities", "blitCapabilitiesGrid", {
          heading: "team & disciplines",
          imageUrl: image("/assets/zayed_dome.jpg"),
          items: [
            {
              title: "Spatial storytelling",
              description:
                "Explain how narrative, scenography, and movement guide the audience through the experience.",
              imageUrl: image("/assets/zayed_dome.jpg"),
              imageAlt: "Immersive dome installation",
            },
            {
              title: "Realtime systems",
              description:
                "Show how technical direction, live engines, and responsive visuals support the concept without flattening it.",
              imageUrl: image("/assets/cosmic_portal.jpg"),
              imageAlt: "Portal-inspired immersive environment",
            },
            {
              title: "Motion & atmosphere",
              description:
                "Use this slot for the team members, collaborators, or production disciplines that shape the final emotional tone.",
              imageUrl: image("/assets/tv_helmet_portrait.jpg"),
              imageAlt: "Portrait from the studio system",
            },
            {
              title: "Original platforms",
              description:
                "Describe the proprietary formats, reusable systems, or authored experiences the studio can adapt for new clients.",
              imageUrl: image("/assets/echoes_installation.jpg"),
              imageAlt: "Original immersive platform visual",
            },
          ],
        }),
        block("blit-studio-awards", "blitAwards", {
          heading: "awards",
          title:
            "blit. has been recognized with awards like LAUS and Evento Plus, and has made its mark internationally with honors at Moscow's Circle of Light festival.",
          body:
            "Accolades aside, what drives this studio is the pursuit of the unexpected. The work looks past the obvious frame and turns constraints into a new operating system.",
          imageUrl: image("/assets/zayed_dome.jpg"),
        }),
        block("blit-studio-quote", "blitVideoQuote", {
          videoUrl: image("/assets/hero_reel.mp4"),
          eyebrow:
            "And the question we asked ourselves: what got us here? Well... not knowing how to say no.",
          quote:
            "like Mark Twain said, \"they didn't know it was impossible, so they did it.\"",
          body: "And that's exactly how we roll. Ready to create something unforgettable?",
          ctaLabel: "let's talk",
          ctaHref: "/contact",
        }),
        block("blit-studio-careers", "blitCareers", {
          title: "Careers",
          body: "ready for something different? check out our open positions and contact us to join our studio.",
          roles: [
            { title: "Technical Artist", href: "/contact" },
            { title: "Environment artist - Unreal engine", href: "/contact" },
            { title: "Freelancers", href: "/contact" },
          ],
        }),
        block("blit-studio-manifesto", "blitManifesto", {
          heading: "how we work",
          items: [
            "Make spectacle carry meaning.",
            "Prototype quickly, then refine the emotional logic.",
            "Let space, story, and presence collide.",
            "Build the thing people keep talking about after they leave.",
          ],
        }),
        block("blit-studio-editorial", "blitEditorialStatement", {
          eyebrow: "awards & momentum",
          title: "Recognized work matters, but unforgettable work matters more.",
          body: "Use this closing statement for recognition, ambition, and your final invitation. The best version balances credibility with hunger, then hands people off to the footer CTA to start the conversation.",
        }),
      ],
      seo: {
        seoTitle: "Studio - Blit Studio",
        seoDescription: "A cinematic editorial studio page with immersive portfolio storytelling.",
      },
    },
    {
      pageKey: "contact",
      title: "Contact",
      slug: "/contact",
      blocks: [
        block("blit-contact-hero", "blitContactHero", {
          title: "start a project",
          subtitle: "Start a project, talk to the studio, or find regional representation.",
          formIntro: "Tell us what you are building and the studio will get back with the next step.",
          submitLabel: "Send Message",
          successCopy: "Thank you. Your submission has been received.",
        }),
        block("blit-contact-grid", "blitContactGrid", {
          groups: [
            {
              title: "New projects",
              contacts: [
                { name: "Marc Colomines", role: "Creative Managing Director", email: "marc@blit.studio", phone: "(+34) 654 632 818" },
                { name: "Hector Mas", role: "New Biz Andorra", email: "hector@blit.studio", phone: "(+376) 673 677" },
              ],
            },
            {
              title: "General inquiries",
              contacts: [
                { name: "Info", email: "ad@blit.studio" },
                { name: "To join the team & freelancers", email: "jobs@blitstudio.com" },
              ],
            },
            {
              title: "Representation",
              contacts: [
                { name: "Pavel Papov", role: "United States and Canada", email: "pavel@suprematistcreative.com", phone: "(+1) 781 3500715" },
                { name: "Wassim Sami Farhoud", role: "Bahrain", email: "wassim@motiv8.events", phone: "(+973) 36554443" },
              ],
            },
          ],
        }),
        block("blit-contact-offices", "blitOffices", {
          heading: "places",
          offices: [
            { name: "Andorra", phone: "(+376) 82 89 81", address: "Passatge d'Europa, 1, AD500 Andorra la Vella", mapUrl: "https://maps.google.com" },
            { name: "Barcelona", phone: "(+34) 93 017 47 67", address: "Carrer de Pallars 84-88, 08018 Barcelona", mapUrl: "https://maps.google.com" },
          ],
        }),
      ],
      seo: {
        seoTitle: "Contact - Blit Studio",
        seoDescription: "Contact details and offices.",
      },
    },
    {
      pageKey: "unfolded",
      title: "Unfolded",
      slug: "/unfolded",
      blocks: [
        block("blit-unfolded-hero", "blitUnfoldedHero", {
          title: "unfolded",
          subtitle: "Notes from the studio on art, technology, and experience design.",
          videoUrl: image("/assets/unfolded_hero.mp4"),
        }),
        block("blit-unfolded-articles", "blitArticleGrid", {
          heading: "articles",
          articles: projects.articles,
        }),
      ],
      seo: {
        seoTitle: "Unfolded - Blit Studio",
        seoDescription: "Editorial notes and articles from the studio.",
      },
    },
  ];

  return pages.map((page) => ({
    pageKey: page.pageKey,
    title: page.title,
    slug: page.slug,
    isRequired: true,
    defaultBlocks: page.blocks,
    allowedBlockTypes: Array.from(new Set(page.blocks.map((entry) => entry.type))),
    seoDefaults: page.seo,
  }));
}

export async function importReactViteTemplate(
  prisma: PrismaClient,
  options: {
    tenantId: string;
    adminId: string;
    zipPath: string;
    originalFilename: string;
    baseUrl: string;
  }
) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dsgnfi-template-import-"));
  try {
    await extractZip(options.zipPath, tempRoot);
    const appRoot = await findViteReactRoot(tempRoot);
    if (!appRoot) {
      throw new ApiRequestError(
        400,
        "template_import_unsupported",
        "The bundle is not a supported React/Vite project."
      );
    }

    const appSource = await fs.readFile(path.join(appRoot, "src", "App.tsx"), "utf8");
    const routes = discoverRoutes(appSource);
    const expectedPages = new Set(["home", "works", "studio", "contact", "unfolded"]);
    const detectedPages = new Set(routes.map((route) => route.pageKey));
    const warnings = [...expectedPages]
      .filter((pageKey) => !detectedPages.has(pageKey))
      .map((pageKey) => `Expected Blit page "${pageKey}" was not discovered in App.tsx.`);

    const { assetMap, copiedAssets } = await copyBundleAssets(appRoot, options.baseUrl);
    const supportedPages = buildBlitPages(assetMap);
    const mappedSections = supportedPages.flatMap((page) =>
      (page.defaultBlocks ?? []).map((block) => block.type)
    );
    const report: ImportReport = {
      source: "react-vite",
      importer: "blit-studio-v1",
      originalFilename: options.originalFilename,
      detectedRoot: path.relative(tempRoot, appRoot) || ".",
      routes,
      mappedPages: supportedPages.map((page) => page.pageKey),
      mappedSections: Array.from(new Set(mappedSections)),
      copiedAssets,
      unsupportedComponents: [],
      warnings,
    };

    const baseTemplateKey = "agency-starter";
    const baseManifest = getTemplateManifest(baseTemplateKey);
    if (!baseManifest) {
      throw new ApiRequestError(500, "template_base_missing", "Base template is missing.");
    }

    const overrides: TemplatePresetOverrides = {
      replaceSupportedPages: true,
      starterSiteSettings: {
        tagline: "Immersive design, art, and technology studio.",
        contactEmail: "ad@blit.studio",
        seoTitle: "Blit Studio",
        seoDescription: "An editable imported React/Vite template for Blit Studio.",
        theme: {
          primaryColor: "#f15a24",
          accentColor: "#101010",
          backgroundColor: "#f5f2ea",
          textColor: "#101010",
        },
      },
      starterNavigation: {
        primary: [
          { label: "Home", pageKey: "home", href: "/", visible: true },
          { label: "Works", pageKey: "works", href: "/works", visible: true },
          { label: "Studio", pageKey: "studio", href: "/studio", visible: true },
          { label: "Contact", pageKey: "contact", href: "/contact", visible: true },
          { label: "Unfolded", pageKey: "unfolded", href: "/unfolded", visible: true },
        ],
        footer: [
          { label: "Works", pageKey: "works", href: "/works", visible: true },
          { label: "Contact", pageKey: "contact", href: "/contact", visible: true },
        ],
      },
      starterContentHints: {
        homeSections: ["blitHeroCollage", "blitFeaturedWork", "blitVideoSection"],
        workEnabled: false,
        processEnabled: false,
      },
      supportedPages,
      importProvenance: {
        report,
        sourceFiles: [
          "src/App.tsx",
          "src/pages/Home.tsx",
          "src/pages/Works.tsx",
          "src/pages/Studio.tsx",
          "src/pages/Contact.tsx",
          "src/pages/Unfolded.tsx",
          "src/data/projects.ts",
        ],
      },
    };

    const validation = validateTemplatePresetOverrides(baseManifest, overrides);
    if (!validation.success) {
      throw new ApiRequestError(
        400,
        "template_import_validation_failed",
        "Imported template defaults did not validate.",
        { overrides: validation.error.issues.map((issue) => issue.message) }
      );
    }

    const key = `blit-studio--${Date.now().toString(36)}`;
    const template = await prisma.template.create({
      data: {
        tenantId: options.tenantId,
        key,
        sourceType: "CUSTOM",
        baseTemplateKey,
        name: "Blit Studio",
        category: "agency",
        description:
          "Imported React/Vite creative studio template mapped into editable Blit blocks.",
        createdBy: options.adminId,
        draftName: "Blit Studio",
        draftCategory: "agency",
        draftDescription:
          "Imported React/Vite creative studio template mapped into editable Blit blocks.",
        draftPresetOverrides: validation.data as Prisma.InputJsonValue,
        status: "ACTIVE",
      },
    });

    await writeAuditLog(prisma, {
      actorAdminUserId: options.adminId,
      action: "template.imported",
      entityType: "template",
      entityId: template.id,
      metadata: {
        key: template.key,
        importer: report.importer,
        routes: report.routes.map((route) => route.path),
      },
    });

    const detail = await getTemplateDetail(prisma, {
      tenantId: options.tenantId,
      templateKey: template.key,
    });

    return {
      id: template.id,
      status: "READY" as const,
      report,
      template: detail,
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    await fs.unlink(options.zipPath).catch(() => undefined);
  }
}

export async function getTemplateImport(
  prisma: PrismaClient,
  options: { tenantId: string; importId: string }
) {
  const template = await prisma.template.findFirst({
    where: {
      id: options.importId,
      tenantId: options.tenantId,
      sourceType: "CUSTOM",
    },
    include: { versions: true },
  });

  if (!template) {
    return null;
  }

  const overrides =
    template.draftPresetOverrides &&
    typeof template.draftPresetOverrides === "object" &&
    !Array.isArray(template.draftPresetOverrides)
      ? (template.draftPresetOverrides as Record<string, unknown>)
      : {};
  const provenance =
    overrides.importProvenance &&
    typeof overrides.importProvenance === "object" &&
    !Array.isArray(overrides.importProvenance)
      ? (overrides.importProvenance as Record<string, unknown>)
      : {};

  return {
    id: template.id,
    status: template.versions.some((version) => version.isActive)
      ? ("PUBLISHED" as const)
      : ("READY" as const),
    report: provenance.report ?? null,
  };
}

export async function publishTemplateImport(
  prisma: PrismaClient,
  options: { tenantId: string; adminId: string; importId: string }
) {
  return publishCustomTemplate(prisma, {
    tenantId: options.tenantId,
    adminId: options.adminId,
    templateId: options.importId,
  });
}
