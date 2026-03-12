import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";

import { prisma } from "../db/prisma";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

const PAGE_KEY = "process";
const SECTION_KEY = "content";

const contentSchema = z.object({
  blocks: z.array(z.any()),
});

function createBlock(
  type: string,
  data: Record<string, unknown>,
  variant?: string
) {
  return {
    id: crypto.randomUUID(),
    type,
    variant,
    data,
  };
}

const defaultContent = {
  blocks: [
    createBlock(
      "processHeroAtticSalt",
      {
        title: "Don't be the side show,\nwhen you can be the star.",
        collageImageUrl: "",
        collageAlt: "Process collage",
      }
    ),
    createBlock(
      "processMethodIntro",
      {
        kicker: "OUR APPROACH TO BRAND BUILDING",
        paragraphs: [
          "Method Branding\u2122 is an extremely mindful approach that empowers our teams with the stage to deliver a brand performance that captivates your audiences and makes them demand an encore.",
          "Inspired by method acting, our iACT process ensures we embody the brand before we express it.",
          "It's strategic, psychological, and rigorously human-centered. The result is a brand identity that feels real, not rehearsed.",
        ],
      }
    ),
    createBlock("processStepsAccordion", {
      heading: "The method to our mastery",
      steps: [
        {
          number: "01",
          title: "Immerse",
          description:
            "An unfiltered dive into the user and your organization to unlock key insights and define what truly makes your brand one-of-a-kind.",
          deliverables: ["Research synthesis", "Insight report"],
        },
        {
          number: "02",
          title: "Articulate",
          description:
            "Learning how your brand connects, clarifying your unique position and surfacing a clear messaging system aligned to your story.",
          deliverables: ["Messaging", "Positioning"],
        },
        {
          number: "03",
          title: "Create",
          description:
            "We then translate your powerful story into visually compelling work designed to communicate your brand with clarity and impact.",
          deliverables: ["Identity system", "Core assets"],
        },
        {
          number: "04",
          title: "Transform",
          description:
            "From product to brand launch, we\u2019ll be your side by side collaborators to bring visibility, clarity, and momentum.",
          deliverables: ["Launch plan", "Activation assets"],
        },
      ],
    }),
    createBlock("processMediaPeekCarousel", {
      heading: "Introducing Brand Seasoning\u00ae",
      description:
        "We invented Brand Seasoning to amplify the brands behind everyday experiences. From workbooks, ecosystems, and digital frameworks to memorable touchpoints designed to keep your craft fresh and recognizable.",
      slides: [
        { title: "Brand Framework", mainImageUrl: "", peekImageUrl: "" },
        { title: "Next Slide", mainImageUrl: "", peekImageUrl: "" },
      ],
      showCounter: true,
    }),
    createBlock("processCtaOutline", {
      title: "Ready to start\na project?",
      linkLabel: "LET'S CHAT",
      href: "/contact",
    }),
  ],
};

function toInputJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Prisma.InputJsonObject;
}

router.use(requireAdmin);

router.get("/content", async (_req, res) => {
  const existing = await prisma.cmsSection.findUnique({
    where: { page_section: { page: PAGE_KEY, section: SECTION_KEY } },
  });

  const draftBlocks = existing
    ? (existing.draftData as { blocks?: unknown } | null)?.blocks
    : null;
  const isEmptyDraft =
    !existing || !Array.isArray(draftBlocks) || draftBlocks.length === 0;

  const record = isEmptyDraft
    ? await prisma.cmsSection.upsert({
        where: { page_section: { page: PAGE_KEY, section: SECTION_KEY } },
        update: {
          draftData: toInputJsonObject(defaultContent),
          status: "DRAFT",
        },
        create: {
          page: PAGE_KEY,
          section: SECTION_KEY,
          draftData: toInputJsonObject(defaultContent),
          publishedData: toInputJsonObject({}),
          status: "DRAFT",
        },
      })
    : existing;

  return res.json({
    ok: true,
    data: record?.draftData ?? defaultContent,
    status: record?.status ?? "DRAFT",
    publishedAt: record?.publishedAt ?? null,
  });
});

router.put("/content", async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
    });
  }

  const record = await prisma.cmsSection.upsert({
    where: { page_section: { page: PAGE_KEY, section: SECTION_KEY } },
    update: {
      draftData: toInputJsonObject(parsed.data),
      status: "DRAFT",
    },
    create: {
      page: PAGE_KEY,
      section: SECTION_KEY,
      draftData: toInputJsonObject(parsed.data),
      publishedData: toInputJsonObject({}),
      status: "DRAFT",
    },
  });

  return res.json({ ok: true, data: record.draftData });
});

router.post("/content/publish", async (_req, res) => {
  const record = await prisma.cmsSection.upsert({
    where: { page_section: { page: PAGE_KEY, section: SECTION_KEY } },
    update: {},
    create: {
      page: PAGE_KEY,
      section: SECTION_KEY,
      draftData: toInputJsonObject(defaultContent),
      publishedData: toInputJsonObject({}),
      status: "DRAFT",
    },
  });

  const updated = await prisma.cmsSection.update({
    where: { page_section: { page: PAGE_KEY, section: SECTION_KEY } },
    data: {
      publishedData: toInputJsonObject(record.draftData),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  return res.json({ ok: true, data: updated.publishedData });
});

export default router;
