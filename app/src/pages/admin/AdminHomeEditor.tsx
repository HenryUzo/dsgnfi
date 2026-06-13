import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";

import { ApiError } from "../../lib/api";
import {
  getAdminSection,
  publishSection,
  saveDraft,
  uploadImage,
  uploadMedia,
  type AdminSection,
} from "../../lib/cmsAdmin";
import { listWorkProjects, type WorkProject } from "../../services/workAdmin";
import { listAdminPages, type AdminPageSummary } from "../../services/siteSettings";
import { SectionCard } from "./components/SectionCard";

const hrefSchema = z
  .string()
  .min(1, "Link is required.")
  .refine(
    (value) => value.startsWith("/") || value.startsWith("http"),
    "Href must start with / or http."
  );

const defaultHero = {
  headline: "Unstoppable identities and experiences for brands on the move.",
  subheadline: "Branding for your next chapter.",
  backgroundImageUrl: "",
  backgroundVideoUrl: "",
  visible: true,
};

const defaultServices = {
  introTitle: "Services",
  introText: "",
  visible: true,
  categories: [
    { title: "Business Growth", items: [""] },
    { title: "Digital Marketing", items: [""] },
    { title: "Branding", items: [""] },
    { title: "Engineering / Enterprise", items: [""] },
  ],
};

const defaultFeaturedWork = {
  title: "Featured Work",
  description:
    "WARNING: (1) SIDE EFFECTS OF ATTIC SALT MAY INCLUDE RAPID GROWTH, DANGEROUS LEVELS OF DIFFERENTIATION, AND MIND-BLOWING CLARITY. (2) WORKING WITH ATTIC SALT IMPAIRS YOUR ABILITY TO BE INVISIBLE AND MAY POSE A THREAT TO THE COMPETITION.",
  count: 3,
  order: "latest" as "latest" | "manual",
  manualSlugs: [] as string[],
};

const defaultFaq = {
  visible: true,
  items: [{ question: "", answer: "" }],
};

const defaultCta = {
  visible: true,
  title: "Ready to start a project?",
  primaryLabel: "Let's Chat",
  primaryHref: "/contact",
  secondaryLabel: "View Work",
  secondaryHref: "/work",
};

const defaultTestimonials = {
  visible: true,
  title: "Testimonials",
  items: [
    {
      quote: "",
      author: "",
      role: "",
      color: "#ffffff",
    },
  ],
};

const defaultAwards = {
  visible: true,
  eyebrow: "Nationally Recognized",
  title: "Trailblazing craftsmanship that wins hearts and awards.",
  listTitle: "Latest Awards & Recognition",
  items: [{ year: "2025", title: "", org: "" }],
};

const defaultBranding = {
  logoImageUrl: "",
  logoAlt: "Dsgnfi",
};

const defaultTheme = {
  brandColor: "#1a4ce0",
};

const heroSchema = z
  .object({
    headline: z.string(),
    subheadline: z.string(),
    backgroundImageUrl: z.string().optional().default(""),
    backgroundVideoUrl: z.string().optional().default(""),
    visible: z.boolean().optional().default(true),
  })
  .catch(defaultHero);

const servicesSchema = z
  .object({
    introTitle: z.string(),
    introText: z.string(),
    visible: z.boolean().optional().default(true),
    categories: z
      .array(
        z.object({
          title: z.string(),
          items: z.array(z.string()),
        })
      )
      .length(4),
  })
  .catch(defaultServices);

const featuredWorkSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    count: z.number().int().min(1).max(6),
    order: z.enum(["latest", "manual"]),
    manualSlugs: z.array(z.string()).optional().default([]),
  })
  .catch(defaultFeaturedWork);

const faqSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    items: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
  })
  .catch(defaultFaq);

const ctaSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    title: z.string(),
    primaryLabel: z.string(),
    primaryHref: hrefSchema,
    secondaryLabel: z.string(),
    secondaryHref: hrefSchema,
  })
  .catch(defaultCta);

const testimonialsSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    title: z.string(),
    items: z.array(
      z.object({
        quote: z.string(),
        author: z.string(),
        role: z.string(),
        color: z.string().optional().default("#ffffff"),
      })
    ),
  })
  .catch(defaultTestimonials);

const awardsSchema = z
  .object({
    visible: z.boolean().optional().default(true),
    eyebrow: z.string(),
    title: z.string(),
    listTitle: z.string(),
    items: z.array(
      z.object({
        year: z.string(),
        title: z.string(),
        org: z.string(),
      })
    ),
  })
  .catch(defaultAwards);

const brandingSchema = z
  .object({
    logoImageUrl: z.string().optional().default(""),
    logoAlt: z.string().optional().default("Dsgnfi"),
  })
  .catch(defaultBranding);

const themeSchema = z
  .object({
    brandColor: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex color like #1a4ce0."),
  })
  .catch(defaultTheme);

type HeroData = z.infer<typeof heroSchema>;
type ServicesData = z.infer<typeof servicesSchema>;
type FeaturedWorkData = z.infer<typeof featuredWorkSchema>;
type FaqData = z.infer<typeof faqSchema>;
type CtaData = z.infer<typeof ctaSchema>;
type TestimonialsData = z.infer<typeof testimonialsSchema>;
type AwardsData = z.infer<typeof awardsSchema>;
type BrandingData = z.infer<typeof brandingSchema>;
type ThemeData = z.infer<typeof themeSchema>;

type SectionState<T> = {
  data: T;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  loading: boolean;
  saving: boolean;
  publishing: boolean;
  error: string | null;
};

type SectionKey =
  | "hero"
  | "services"
  | "featuredWork"
  | "faq"
  | "cta"
  | "testimonials"
  | "awards"
  | "branding"
  | "theme";

const sectionPageMap: Record<SectionKey, string> = {
  hero: "home",
  services: "home",
  featuredWork: "home",
  faq: "home",
  cta: "home",
  testimonials: "home",
  awards: "home",
  branding: "site",
  theme: "site",
};

const inputClassName =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none";

const labelClassName = "text-xs uppercase tracking-widest text-white/50";

function resolveSectionData<T>(
  record: AdminSection,
  schema: z.ZodType<T>,
  fallback: T
): T {
  const draftParsed = schema.safeParse(record.draftData);
  if (draftParsed.success) return draftParsed.data;
  const publishedParsed = schema.safeParse(record.publishedData);
  if (publishedParsed.success) return publishedParsed.data;
  return fallback;
}

function VisibilityToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border border-white/30 bg-black/40"
      />
      Visible on site
    </label>
  );
}
export function AdminHomeEditor() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [homePageSummary, setHomePageSummary] = useState<AdminPageSummary | null>(null);

  const [hero, setHero] = useState<SectionState<HeroData>>({
    data: defaultHero,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [services, setServices] = useState<SectionState<ServicesData>>({
    data: defaultServices,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [featuredWork, setFeaturedWork] = useState<
    SectionState<FeaturedWorkData>
  >({
    data: defaultFeaturedWork,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [faq, setFaq] = useState<SectionState<FaqData>>({
    data: defaultFaq,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [cta, setCta] = useState<SectionState<CtaData>>({
    data: defaultCta,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [testimonials, setTestimonials] = useState<
    SectionState<TestimonialsData>
  >({
    data: defaultTestimonials,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [awards, setAwards] = useState<SectionState<AwardsData>>({
    data: defaultAwards,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [branding, setBranding] = useState<SectionState<BrandingData>>({
    data: defaultBranding,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [theme, setTheme] = useState<SectionState<ThemeData>>({
    data: defaultTheme,
    status: "DRAFT",
    publishedAt: null,
    loading: true,
    saving: false,
    publishing: false,
    error: null,
  });

  const [heroUploading, setHeroUploading] = useState(false);
  const [heroVideoUploading, setHeroVideoUploading] = useState(false);
  const [workProjects, setWorkProjects] = useState<WorkProject[]>([]);
  const [workProjectsLoading, setWorkProjectsLoading] = useState(false);
  const [workProjectsError, setWorkProjectsError] = useState<string | null>(null);
  const [manualPick, setManualPick] = useState("");

  const handleAuthError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      navigate("/admin/login", { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadHomePageSummary() {
      try {
        const pages = await listAdminPages();
        if (!cancelled) {
          setHomePageSummary(pages.find((page) => page.pageKey === "home") ?? null);
        }
      } catch (err) {
        if (!cancelled && !handleAuthError(err)) {
          setHomePageSummary(null);
        }
      }
    }

    void loadHomePageSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHero = async () => {
    setHero((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "hero");
      const data = resolveSectionData(record, heroSchema, defaultHero);

      setHero((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setHero((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadServices = async () => {
    setServices((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "services");
      const data = resolveSectionData(record, servicesSchema, defaultServices);

      setServices((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setServices((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadFeaturedWork = async () => {
    setFeaturedWork((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "featuredWork");
      const data = resolveSectionData(
        record,
        featuredWorkSchema,
        defaultFeaturedWork
      );

      setFeaturedWork((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setFeaturedWork((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadFaq = async () => {
    setFaq((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "faq");
      const data = resolveSectionData(record, faqSchema, defaultFaq);

      setFaq((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setFaq((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadCta = async () => {
    setCta((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "cta");
      const data = resolveSectionData(record, ctaSchema, defaultCta);

      setCta((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setCta((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadTestimonials = async () => {
    setTestimonials((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "testimonials");
      const data = resolveSectionData(
        record,
        testimonialsSchema,
        defaultTestimonials
      );

      setTestimonials((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setTestimonials((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadAwards = async () => {
    setAwards((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("home", "awards");
      const data = resolveSectionData(record, awardsSchema, defaultAwards);

      setAwards((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setAwards((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadBranding = async () => {
    setBranding((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("site", "branding");
      const data = resolveSectionData(record, brandingSchema, defaultBranding);

      setBranding((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setBranding((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadTheme = async () => {
    setTheme((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const record = await getAdminSection("site", "theme");
      const data = resolveSectionData(record, themeSchema, defaultTheme);

      setTheme((prev) => ({
        ...prev,
        data,
        status: record.status,
        publishedAt: record.publishedAt,
        loading: false,
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load.";
      setTheme((prev) => ({ ...prev, loading: false, error: message }));
      toast.error(message);
    }
  };

  const loadWorkProjects = async () => {
    setWorkProjectsLoading(true);
    setWorkProjectsError(null);

    try {
      const projects = await listWorkProjects();
      setWorkProjects(projects);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message =
        err instanceof Error ? err.message : "Failed to load work projects.";
      setWorkProjectsError(message);
    } finally {
      setWorkProjectsLoading(false);
    }
  };

  const reloadSection = (section: SectionKey) => {
    switch (section) {
      case "hero":
        return loadHero();
      case "services":
        return loadServices();
      case "featuredWork":
        return loadFeaturedWork();
      case "faq":
        return loadFaq();
      case "cta":
        return loadCta();
      case "testimonials":
        return loadTestimonials();
      case "awards":
        return loadAwards();
      case "branding":
        return loadBranding();
      case "theme":
        return loadTheme();
      default:
        return undefined;
    }
  };

  useEffect(() => {
    loadHero();
    loadServices();
    loadFeaturedWork();
    loadFaq();
    loadCta();
    loadTestimonials();
    loadAwards();
    loadBranding();
    loadTheme();
    loadWorkProjects();
  }, [admin?.currentSite?.id]);

  const handleSave = async <T,>(
    section: SectionKey,
    data: T,
    setState: React.Dispatch<React.SetStateAction<SectionState<T>>>,
    schema?: z.ZodTypeAny
  ) => {
    if (schema) {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Invalid data.";
        setState((prev) => ({ ...prev, error: message }));
        toast.error(message);
        return;
      }
    }

    setState((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const page = sectionPageMap[section];
      await saveDraft(page, section, data as Record<string, unknown>);
      toast.success("Draft saved.");
      await reloadSection(section);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Save failed.";
      setState((prev) => ({ ...prev, saving: false, error: message }));
      toast.error(message);
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handlePublish = async (
    section: SectionKey,
    setState: React.Dispatch<React.SetStateAction<SectionState<any>>>,
    schema?: z.ZodTypeAny,
    data?: unknown
  ) => {
    if (schema) {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Invalid data.";
        setState((prev) => ({ ...prev, error: message }));
        toast.error(message);
        return;
      }
    }

    setState((prev) => ({ ...prev, publishing: true, error: null }));

    try {
      const page = sectionPageMap[section];
      if (data && typeof data === "object") {
        await saveDraft(page, section, data as Record<string, unknown>);
      }
      await publishSection(page, section);
      toast.success("Section published.");
      await reloadSection(section);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Publish failed.";
      setState((prev) => ({ ...prev, publishing: false, error: message }));
      toast.error(message);
    } finally {
      setState((prev) => ({ ...prev, publishing: false }));
    }
  };


  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8">
        <section className="rounded-3xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm text-amber-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-100/70">Legacy compatibility</p>
              <p className="mt-3 font-semibold">This is the older section-based homepage editor.</p>
              <p className="mt-2 text-amber-50/75">
                It remains available for compatibility with legacy `CmsSection` homepage content. It does not replace the block-based Page Editor.
              </p>
            </div>
            {homePageSummary?.editorResolution.hasModernPage ? (
              <button
                type="button"
                onClick={() => navigate("/admin/pages/home")}
                className="inline-flex rounded-full border border-amber-200/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-50 hover:border-amber-100"
              >
                Open block editor
              </button>
            ) : null}
          </div>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Home Editor</p>
          <p className="mt-3">
            Home sections save and publish independently on this legacy editor surface.
            Draft changes are not live until each section is published.
          </p>
          <p className="mt-2 text-amber-100/80">
            Preview links are generated from Site Settings and expire automatically.
          </p>
        </section>
        <SectionCard
          title="Hero"
          status={hero.status}
          publishedAt={hero.publishedAt}
          saving={hero.saving || hero.loading}
          publishing={hero.publishing || hero.loading}
          onSave={() => handleSave("hero", hero.data, setHero, heroSchema)}
          onPublish={() => handlePublish("hero", setHero, heroSchema, hero.data)}
          error={hero.error}
        >
          <VisibilityToggle
            value={hero.data.visible}
            onChange={(visible) =>
              setHero((prev) => ({
                ...prev,
                data: { ...prev.data, visible },
              }))
            }
          />
          <div className="flex flex-col gap-2">
            <label className={labelClassName}>Background image</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setHeroUploading(true);
                  try {
                    const result = await uploadImage(file);
                    setHero((prev) => ({
                      ...prev,
                      data: { ...prev.data, backgroundImageUrl: result.url },
                    }));
                    toast.success("Background image uploaded.");
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Upload failed.";
                    toast.error(message);
                  } finally {
                    setHeroUploading(false);
                    event.currentTarget.value = "";
                  }
                }}
                className="text-xs uppercase tracking-widest text-white/60"
              />
              {hero.data.backgroundImageUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setHero((prev) => ({
                      ...prev,
                      data: { ...prev.data, backgroundImageUrl: "" },
                    }))
                  }
                  className="text-xs uppercase tracking-widest text-white/60 hover:text-white"
                >
                  Remove image
                </button>
              ) : null}
              {heroUploading ? (
                <span className="text-xs uppercase tracking-widest text-white/40">
                  UploadingÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦
                </span>
              ) : null}
            </div>
            {hero.data.backgroundImageUrl ? (
              <img
                src={hero.data.backgroundImageUrl}
                alt="Hero background preview"
                className="mt-2 w-full max-w-md rounded-xl border border-white/10"
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClassName}>Background video</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="video/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setHeroVideoUploading(true);
                  try {
                    const result = await uploadMedia(file);
                    setHero((prev) => ({
                      ...prev,
                      data: { ...prev.data, backgroundVideoUrl: result.url },
                    }));
                    toast.success("Background video uploaded.");
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Upload failed.";
                    toast.error(message);
                  } finally {
                    setHeroVideoUploading(false);
                    event.currentTarget.value = "";
                  }
                }}
                className="text-xs uppercase tracking-widest text-white/60"
              />
              {hero.data.backgroundVideoUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setHero((prev) => ({
                      ...prev,
                      data: { ...prev.data, backgroundVideoUrl: "" },
                    }))
                  }
                  className="text-xs uppercase tracking-widest text-white/60 hover:text-white"
                >
                  Remove video
                </button>
              ) : null}
              {heroVideoUploading ? (
                <span className="text-xs uppercase tracking-widest text-white/40">
                  UploadingÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦
                </span>
              ) : null}
            </div>
            {hero.data.backgroundVideoUrl ? (
              <video
                src={hero.data.backgroundVideoUrl}
                controls
                muted
                className="mt-2 w-full max-w-md rounded-xl border border-white/10"
              />
            ) : null}
            <p className="text-xs text-white/40">
              Video will display as the hero background. If you set both, the
              image is used as a fallback poster.
            </p>
          </div>
          <div className="space-y-3">
            <label className={labelClassName}>Headline</label>
            <textarea
              rows={3}
              value={hero.data.headline}
              onChange={(event) =>
                setHero((prev) => ({
                  ...prev,
                  data: { ...prev.data, headline: event.target.value },
                }))
              }
              className={inputClassName}
            />
          </div>
          <div className="space-y-3">
            <label className={labelClassName}>Subheadline</label>
            <textarea
              rows={2}
              value={hero.data.subheadline}
              onChange={(event) =>
                setHero((prev) => ({
                  ...prev,
                  data: { ...prev.data, subheadline: event.target.value },
                }))
              }
              className={inputClassName}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Services"
          status={services.status}
          publishedAt={services.publishedAt}
          saving={services.saving || services.loading}
          publishing={services.publishing || services.loading}
          onSave={() =>
            handleSave("services", services.data, setServices, servicesSchema)
          }
          onPublish={() =>
            handlePublish(
              "services",
              setServices,
              servicesSchema,
              services.data
            )
          }
          error={services.error}
        >
          <VisibilityToggle
            value={services.data.visible}
            onChange={(visible) =>
              setServices((prev) => ({
                ...prev,
                data: { ...prev.data, visible },
              }))
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className={labelClassName}>Intro title</label>
              <input
                value={services.data.introTitle}
                onChange={(event) =>
                  setServices((prev) => ({
                    ...prev,
                    data: { ...prev.data, introTitle: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-3">
              <label className={labelClassName}>Intro text</label>
              <textarea
                rows={3}
                value={services.data.introText}
                onChange={(event) =>
                  setServices((prev) => ({
                    ...prev,
                    data: { ...prev.data, introText: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {services.data.categories.map((category, catIndex) => (
              <div
                key={`${category.title}-${catIndex}`}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                <div className="space-y-2">
                  <label className={labelClassName}>Category title</label>
                  <input
                    value={category.title}
                    onChange={(event) =>
                      setServices((prev) => {
                        const categories = prev.data.categories.map(
                          (cat, index) =>
                            index === catIndex
                              ? { ...cat, title: event.target.value }
                              : cat
                        );
                        return {
                          ...prev,
                          data: { ...prev.data, categories },
                        };
                      })
                    }
                    className={inputClassName}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <p className={labelClassName}>Items</p>
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={`${catIndex}-${itemIndex}`}
                      className="flex items-center gap-2"
                    >
                      <input
                        value={item}
                        onChange={(event) =>
                          setServices((prev) => {
                            const categories = prev.data.categories.map(
                              (cat, index) => {
                                if (index !== catIndex) return cat;
                                const items = cat.items.map((value, idx) =>
                                  idx === itemIndex
                                    ? event.target.value
                                    : value
                                );
                                return { ...cat, items };
                              }
                            );
                            return {
                              ...prev,
                              data: { ...prev.data, categories },
                            };
                          })
                        }
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setServices((prev) => {
                            const categories = prev.data.categories.map(
                              (cat, index) => {
                                if (index !== catIndex) return cat;
                                const items = cat.items.filter(
                                  (_, idx) => idx !== itemIndex
                                );
                                return { ...cat, items };
                              }
                            );
                            return {
                              ...prev,
                              data: { ...prev.data, categories },
                            };
                          })
                        }
                        className="text-xs uppercase tracking-widest text-white/50 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setServices((prev) => {
                        const categories = prev.data.categories.map(
                          (cat, index) => {
                            if (index !== catIndex) return cat;
                            return { ...cat, items: [...cat.items, ""] };
                          }
                        );
                        return {
                          ...prev,
                          data: { ...prev.data, categories },
                        };
                      })
                    }
                    className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
                  >
                    + Add item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="FAQ"
          status={faq.status}
          publishedAt={faq.publishedAt}
          saving={faq.saving || faq.loading}
          publishing={faq.publishing || faq.loading}
          onSave={() => handleSave("faq", faq.data, setFaq, faqSchema)}
          onPublish={() => handlePublish("faq", setFaq, faqSchema, faq.data)}
          error={faq.error}
        >
          <VisibilityToggle
            value={faq.data.visible}
            onChange={(visible) =>
              setFaq((prev) => ({
                ...prev,
                data: { ...prev.data, visible },
              }))
            }
          />
          <div className="space-y-4">
            {faq.data.items.map((item, index) => (
              <div
                key={`${index}-${item.question}`}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                <div className="space-y-2">
                  <label className={labelClassName}>Question</label>
                  <input
                    value={item.question}
                    onChange={(event) =>
                      setFaq((prev) => {
                        const items = prev.data.items.map((entry, idx) =>
                          idx === index
                            ? { ...entry, question: event.target.value }
                            : entry
                        );
                        return { ...prev, data: { ...prev.data, items } };
                      })
                    }
                    className={inputClassName}
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <label className={labelClassName}>Answer</label>
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(event) =>
                      setFaq((prev) => {
                        const items = prev.data.items.map((entry, idx) =>
                          idx === index
                            ? { ...entry, answer: event.target.value }
                            : entry
                        );
                        return { ...prev, data: { ...prev.data, items } };
                      })
                    }
                    className={inputClassName}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFaq((prev) => {
                      const items = prev.data.items.filter(
                        (_, idx) => idx !== index
                      );
                      return { ...prev, data: { ...prev.data, items } };
                    })
                  }
                  className="mt-3 text-xs uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Remove item
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFaq((prev) => ({
                  ...prev,
                  data: {
                    ...prev.data,
                    items: [...prev.data.items, { question: "", answer: "" }],
                  },
                }))
              }
              className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
            >
              + Add FAQ
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Featured Work"
          status={featuredWork.status}
          publishedAt={featuredWork.publishedAt}
          saving={featuredWork.saving || featuredWork.loading}
          publishing={featuredWork.publishing || featuredWork.loading}
          onSave={() =>
            handleSave(
              "featuredWork",
              featuredWork.data,
              setFeaturedWork,
              featuredWorkSchema
            )
          }
          onPublish={() =>
            handlePublish(
              "featuredWork",
              setFeaturedWork,
              featuredWorkSchema,
              featuredWork.data
            )
          }
          error={featuredWork.error}
        >
          <div className="space-y-3">
            <label className={labelClassName}>Section title</label>
            <input
              value={featuredWork.data.title}
              onChange={(event) =>
                setFeaturedWork((prev) => ({
                  ...prev,
                  data: { ...prev.data, title: event.target.value },
                }))
              }
              className={inputClassName}
            />
          </div>
          <div className="space-y-3">
            <label className={labelClassName}>Description</label>
            <textarea
              rows={4}
              value={featuredWork.data.description}
              onChange={(event) =>
                setFeaturedWork((prev) => ({
                  ...prev,
                  data: { ...prev.data, description: event.target.value },
                }))
              }
              className={inputClassName}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <label className={labelClassName}>Count</label>
              <input
                type="number"
                min={1}
                max={6}
                value={featuredWork.data.count}
                onChange={(event) =>
                  setFeaturedWork((prev) => ({
                    ...prev,
                    data: {
                      ...prev.data,
                      count: Number(event.target.value || 1),
                    },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className={labelClassName}>Ordering</label>
              <select
                value={featuredWork.data.order}
                onChange={(event) =>
                  setFeaturedWork((prev) => ({
                    ...prev,
                    data: {
                      ...prev.data,
                      order: event.target.value as "latest" | "manual",
                    },
                  }))
                }
                className={inputClassName}
              >
                <option value="latest">Latest published (default)</option>
                <option value="manual">Manual by slug</option>
              </select>
            </div>
          </div>
          {featuredWork.data.order === "manual" ? (
            <div className="space-y-3">
              <label className={labelClassName}>Manual project slugs</label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={manualPick}
                  onChange={(event) => setManualPick(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Select a projectÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</option>
                  {workProjects
                    .filter((project) => project.slug)
                    .map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.title || "(Untitled)"} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {project.slug}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!manualPick) return;
                    setFeaturedWork((prev) => {
                      if (prev.data.manualSlugs.includes(manualPick)) {
                        return prev;
                      }
                      return {
                        ...prev,
                        data: {
                          ...prev.data,
                          manualSlugs: [...prev.data.manualSlugs, manualPick],
                        },
                      };
                    });
                    setManualPick("");
                  }}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
                  disabled={!manualPick}
                >
                  Add
                </button>
              </div>
              {workProjectsLoading ? (
                <p className="text-xs text-white/50">Loading projectsÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</p>
              ) : null}
              {workProjectsError ? (
                <p className="text-xs text-red-300">{workProjectsError}</p>
              ) : null}

              <div className="space-y-2">
                {featuredWork.data.manualSlugs.length === 0 ? (
                  <p className="text-xs text-white/40">
                    Add projects to define a custom order.
                  </p>
                ) : (
                  featuredWork.data.manualSlugs.map((slug, index) => {
                    const project = workProjects.find(
                      (item) => item.slug === slug
                    );
                    const label = project?.title || slug;
                    return (
                      <div
                        key={`${slug}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-white">{label}</p>
                          <p className="text-xs text-white/50">{slug}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFeaturedWork((prev) => {
                                if (index === 0) return prev;
                                const next = [...prev.data.manualSlugs];
                                [next[index - 1], next[index]] = [
                                  next[index],
                                  next[index - 1],
                                ];
                                return {
                                  ...prev,
                                  data: { ...prev.data, manualSlugs: next },
                                };
                              })
                            }
                            className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-50"
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFeaturedWork((prev) => {
                                if (index >= prev.data.manualSlugs.length - 1) {
                                  return prev;
                                }
                                const next = [...prev.data.manualSlugs];
                                [next[index + 1], next[index]] = [
                                  next[index],
                                  next[index + 1],
                                ];
                                return {
                                  ...prev,
                                  data: { ...prev.data, manualSlugs: next },
                                };
                              })
                            }
                            className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-50"
                            disabled={index >= featuredWork.data.manualSlugs.length - 1}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFeaturedWork((prev) => ({
                                ...prev,
                                data: {
                                  ...prev.data,
                                  manualSlugs: prev.data.manualSlugs.filter(
                                    (_, idx) => idx !== index
                                  ),
                                },
                              }))
                            }
                            className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-white/40">
                Ordering is respected, missing slugs are ignored.
              </p>
            </div>
          ) : null}
        </SectionCard>

        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">
                Deprecated Surface
              </p>
              <h2 className="mt-3 text-xl font-semibold text-white">
                Site branding and theme moved
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-white/70">
                Logo, favicon, theme tokens, and navigation now live in the canonical
                site presentation screen. Use Site Settings for live editing to avoid
                conflicting sources of truth.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/site-settings")}
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white"
            >
              Open Site Settings
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Legacy logo snapshot
              </p>
              {branding.data.logoImageUrl ? (
                <img
                  src={branding.data.logoImageUrl}
                  alt={branding.data.logoAlt || "Logo preview"}
                  className="mt-3 h-14 w-auto rounded-lg border border-white/10 bg-black/40 p-2"
                />
              ) : (
                <p className="mt-3 text-sm text-white/60">No legacy logo saved here.</p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Legacy brand color
              </p>
              <div className="mt-3 flex items-center gap-3 text-sm text-white/70">
                <span
                  className="inline-block h-8 w-8 rounded-full border border-white/10"
                  style={{ backgroundColor: theme.data.brandColor }}
                />
                <span>{theme.data.brandColor}</span>
              </div>
            </div>
          </div>
        </section>

        <SectionCard
          title="CTA"
          status={cta.status}
          publishedAt={cta.publishedAt}
          saving={cta.saving || cta.loading}
          publishing={cta.publishing || cta.loading}
          onSave={() => handleSave("cta", cta.data, setCta, ctaSchema)}
          onPublish={() => handlePublish("cta", setCta, ctaSchema, cta.data)}
          error={cta.error}
        >
          <VisibilityToggle
            value={cta.data.visible}
            onChange={(visible) =>
              setCta((prev) => ({
                ...prev,
                data: { ...prev.data, visible },
              }))
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 md:col-span-2">
              <label className={labelClassName}>Title</label>
              <input
                value={cta.data.title}
                onChange={(event) =>
                  setCta((prev) => ({
                    ...prev,
                    data: { ...prev.data, title: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-3">
              <label className={labelClassName}>Primary label</label>
              <input
                value={cta.data.primaryLabel}
                onChange={(event) =>
                  setCta((prev) => ({
                    ...prev,
                    data: { ...prev.data, primaryLabel: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-3">
              <label className={labelClassName}>Primary href</label>
              <input
                value={cta.data.primaryHref}
                onChange={(event) =>
                  setCta((prev) => ({
                    ...prev,
                    data: { ...prev.data, primaryHref: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-3">
              <label className={labelClassName}>Secondary label</label>
              <input
                value={cta.data.secondaryLabel}
                onChange={(event) =>
                  setCta((prev) => ({
                    ...prev,
                    data: { ...prev.data, secondaryLabel: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-3">
              <label className={labelClassName}>Secondary href</label>
              <input
                value={cta.data.secondaryHref}
                onChange={(event) =>
                  setCta((prev) => ({
                    ...prev,
                    data: { ...prev.data, secondaryHref: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>
        </SectionCard>
        <SectionCard
          title="Testimonials"
          status={testimonials.status}
          publishedAt={testimonials.publishedAt}
          saving={testimonials.saving || testimonials.loading}
          publishing={testimonials.publishing || testimonials.loading}
          onSave={() =>
            handleSave(
              "testimonials",
              testimonials.data,
              setTestimonials,
              testimonialsSchema
            )
          }
          onPublish={() =>
            handlePublish(
              "testimonials",
              setTestimonials,
              testimonialsSchema,
              testimonials.data
            )
          }
          error={testimonials.error}
        >
          <VisibilityToggle
            value={testimonials.data.visible}
            onChange={(visible) =>
              setTestimonials((prev) => ({
                ...prev,
                data: { ...prev.data, visible },
              }))
            }
          />
          <div className="space-y-3">
            <label className={labelClassName}>Section title</label>
            <input
              value={testimonials.data.title}
              onChange={(event) =>
                setTestimonials((prev) => ({
                  ...prev,
                  data: { ...prev.data, title: event.target.value },
                }))
              }
              className={inputClassName}
            />
          </div>
          <div className="space-y-4">
            {testimonials.data.items.map((item, index) => (
              <div
                key={`${item.author}-${index}`}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                <div className="space-y-2">
                  <label className={labelClassName}>Quote</label>
                  <textarea
                    rows={3}
                    value={item.quote}
                    onChange={(event) =>
                      setTestimonials((prev) => {
                        const items = prev.data.items.map((entry, idx) =>
                          idx === index
                            ? { ...entry, quote: event.target.value }
                            : entry
                        );
                        return { ...prev, data: { ...prev.data, items } };
                      })
                    }
                    className={inputClassName}
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className={labelClassName}>Author</label>
                    <input
                      value={item.author}
                      onChange={(event) =>
                        setTestimonials((prev) => {
                          const items = prev.data.items.map((entry, idx) =>
                            idx === index
                              ? { ...entry, author: event.target.value }
                              : entry
                          );
                          return { ...prev, data: { ...prev.data, items } };
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClassName}>Role</label>
                    <input
                      value={item.role}
                      onChange={(event) =>
                        setTestimonials((prev) => {
                          const items = prev.data.items.map((entry, idx) =>
                            idx === index
                              ? { ...entry, role: event.target.value }
                              : entry
                          );
                          return { ...prev, data: { ...prev.data, items } };
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClassName}>Card color</label>
                    <input
                      value={item.color}
                      onChange={(event) =>
                        setTestimonials((prev) => {
                          const items = prev.data.items.map((entry, idx) =>
                            idx === index
                              ? { ...entry, color: event.target.value }
                              : entry
                          );
                          return { ...prev, data: { ...prev.data, items } };
                        })
                      }
                      placeholder="#ffffff"
                      className={inputClassName}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTestimonials((prev) => {
                      const items = prev.data.items.filter(
                        (_, idx) => idx !== index
                      );
                      return { ...prev, data: { ...prev.data, items } };
                    })
                  }
                  className="mt-3 text-xs uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Remove testimonial
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setTestimonials((prev) => ({
                  ...prev,
                  data: {
                    ...prev.data,
                    items: [
                      ...prev.data.items,
                      { quote: "", author: "", role: "", color: "#ffffff" },
                    ],
                  },
                }))
              }
              className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
            >
              + Add testimonial
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Nationally Recognized"
          status={awards.status}
          publishedAt={awards.publishedAt}
          saving={awards.saving || awards.loading}
          publishing={awards.publishing || awards.loading}
          onSave={() =>
            handleSave("awards", awards.data, setAwards, awardsSchema)
          }
          onPublish={() =>
            handlePublish("awards", setAwards, awardsSchema, awards.data)
          }
          error={awards.error}
        >
          <VisibilityToggle
            value={awards.data.visible}
            onChange={(visible) =>
              setAwards((prev) => ({
                ...prev,
                data: { ...prev.data, visible },
              }))
            }
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className={labelClassName}>Eyebrow</label>
              <input
                value={awards.data.eyebrow}
                onChange={(event) =>
                  setAwards((prev) => ({
                    ...prev,
                    data: { ...prev.data, eyebrow: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClassName}>List title</label>
              <input
                value={awards.data.listTitle}
                onChange={(event) =>
                  setAwards((prev) => ({
                    ...prev,
                    data: { ...prev.data, listTitle: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className={labelClassName}>Headline</label>
              <textarea
                rows={2}
                value={awards.data.title}
                onChange={(event) =>
                  setAwards((prev) => ({
                    ...prev,
                    data: { ...prev.data, title: event.target.value },
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-4">
            {awards.data.items.map((item, index) => (
              <div
                key={`${item.year}-${item.title}-${index}`}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className={labelClassName}>Year</label>
                    <input
                      value={item.year}
                      onChange={(event) =>
                        setAwards((prev) => {
                          const items = prev.data.items.map((entry, idx) =>
                            idx === index
                              ? { ...entry, year: event.target.value }
                              : entry
                          );
                          return { ...prev, data: { ...prev.data, items } };
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClassName}>Award</label>
                    <input
                      value={item.title}
                      onChange={(event) =>
                        setAwards((prev) => {
                          const items = prev.data.items.map((entry, idx) =>
                            idx === index
                              ? { ...entry, title: event.target.value }
                              : entry
                          );
                          return { ...prev, data: { ...prev.data, items } };
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelClassName}>Org / Project</label>
                    <input
                      value={item.org}
                      onChange={(event) =>
                        setAwards((prev) => {
                          const items = prev.data.items.map((entry, idx) =>
                            idx === index
                              ? { ...entry, org: event.target.value }
                              : entry
                          );
                          return { ...prev, data: { ...prev.data, items } };
                        })
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAwards((prev) => {
                      const items = prev.data.items.filter(
                        (_, idx) => idx !== index
                      );
                      return { ...prev, data: { ...prev.data, items } };
                    })
                  }
                  className="mt-3 text-xs uppercase tracking-widest text-white/50 hover:text-white"
                >
                  Remove award
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setAwards((prev) => ({
                  ...prev,
                  data: {
                    ...prev.data,
                    items: [...prev.data.items, { year: "", title: "", org: "" }],
                  },
                }))
              }
              className="text-xs uppercase tracking-widest text-white/70 hover:text-white"
            >
              + Add award
            </button>
          </div>
        </SectionCard>
      </div>
  );
}
