import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:3000,http://localhost:5173";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

type MembershipRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
type CmsStatus = "DRAFT" | "PUBLISHED";

type TenantRecord = {
  id: string;
  slug: string;
  name: string;
};

type TemplateVersionRecord = {
  id: string;
  templateId: string;
  version: string;
  isActive: boolean;
  manifestKey: string;
  presetOverrides: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type TemplateRecord = {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  sourceType: "STARTER" | "CUSTOM";
  baseTemplateKey: string | null;
  versions: TemplateVersionRecord[];
};

type SiteRecord = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isDefault: boolean;
  templateId: string | null;
  templateVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  template: TemplateRecord | null;
  templateVersion: TemplateVersionRecord | null;
  tenant: TenantRecord;
};

type RevisionRecord = {
  id: string;
  pageId: string;
  revisionNumber: number;
  state: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  content: unknown;
  schemaVersion: number;
  checksum: string | null;
  createdBy: string | null;
  publishedBy: string | null;
  createdAt: Date;
  publishedAt: Date | null;
};

type PageRecord = {
  id: string;
  siteId: string;
  pageKey: string;
  pageTemplateKey: string | null;
  sourceTemplateId: string | null;
  sourceTemplateVersionId: string | null;
  sourcePageBlueprintKey: string | null;
  lineageStatus: "UNTRACKED" | "INHERITED" | "MODIFIED";
  allowedBlockTypes: string[];
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  isVisible: boolean;
  hierarchyRole: "MAIN" | "INNER";
  defaultParentPageKey: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  currentDraftRevisionId: string | null;
  currentPublishedRevisionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CmsSectionRecord = {
  siteId: string;
  page: string;
  section: string;
  status: CmsStatus;
  draftData: Record<string, unknown>;
  publishedData: Record<string, unknown>;
  updatedAt: Date;
  publishedAt: Date | null;
};

type WorkProjectRecord = {
  id: string;
  siteId: string;
  templateId: string;
  titleDraft: string;
  slugDraft: string;
  excerptDraft: string;
  coverImageDraft: string;
  draftContent: Record<string, unknown>;
  titlePublished: string | null;
  slugPublished: string | null;
  excerptPublished: string | null;
  coverImagePublished: string | null;
  publishedContent: Record<string, unknown>;
  status: CmsStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ tag: { name: string; slug: string } }>;
};

type AuditLogRecord = {
  actorAdminUserId: string | null;
  siteId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
};

type State = {
  tenants: TenantRecord[];
  memberships: Array<{
    userId: string;
    tenantId: string;
    role: MembershipRole;
    createdAt: Date;
  }>;
  sites: SiteRecord[];
  pages: PageRecord[];
  revisions: RevisionRecord[];
  cmsSections: CmsSectionRecord[];
  workProjects: WorkProjectRecord[];
  auditLogs: AuditLogRecord[];
};

let state: State;
let revisionCounter = 100;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function signAdminToken(payload: {
  id: string;
  email: string;
  tenantId?: string;
  siteId?: string;
}) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

function makeTemplateVersion(input: Omit<TemplateVersionRecord, "createdAt" | "updatedAt">) {
  return {
    ...input,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  };
}

function makeTemplate(input: Omit<TemplateRecord, "versions"> & { versions: TemplateVersionRecord[] }) {
  return input;
}

function makeSite(input: Omit<SiteRecord, "createdAt" | "updatedAt">): SiteRecord {
  return {
    ...input,
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
  };
}

function contentWithHeadline(headline: string) {
  return {
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        data: {
          headline,
          subheadline: `${headline} subheadline`,
          primaryCtaLabel: "Contact",
          primaryCtaHref: "/contact",
        },
      },
    ],
  };
}

function blitHomeContent(titlePrefix: string) {
  return {
    blocks: [
      {
        id: "blit-home-hero",
        type: "blitHeroCollage",
        data: {
          eyebrow: "Blit",
          headline: `${titlePrefix} hero`,
          caption: `${titlePrefix} caption`,
          images: [{ imageUrl: "/existing.jpg", alt: "Existing" }],
        },
      },
      {
        id: "blit-home-featured",
        type: "blitFeaturedWork",
        data: {
          heading: "featured work",
          title: `${titlePrefix} featured`,
          ctaLabel: "See works",
          ctaHref: "/works",
          projects: [],
        },
      },
      {
        id: "blit-home-editorial",
        type: "blitEditorialStatement",
        data: {
          eyebrow: "statement",
          title: `${titlePrefix} editorial`,
          body: `${titlePrefix} body`,
        },
      },
      {
        id: "blit-home-video",
        type: "blitVideoSection",
        data: {
          title: `${titlePrefix} showreel`,
          videoUrl: "/showreel.mp4",
        },
      },
      {
        id: "blit-home-capabilities",
        type: "blitCapabilitiesGrid",
        data: {
          heading: "capabilities",
          imageUrl: "/capabilities.jpg",
          items: [],
        },
      },
      {
        id: "blit-home-gallery",
        type: "blitHorizontalGallery",
        data: {
          heading: "selected moments",
          projects: [
            {
              title: `${titlePrefix} gallery card`,
              subtitle: `${titlePrefix} subtitle`,
              image: "/gallery.jpg",
              href: "/works#gallery",
            },
          ],
        },
      },
      {
        id: "blit-home-final",
        type: "blitFinalStatement",
        data: { title: `${titlePrefix} final` },
      },
    ],
  };
}

function addPage(options: {
  id: string;
  siteId: string;
  pageKey: string;
  slug: string;
  title: string;
  draftContent: unknown;
  publishedContent?: unknown;
  pageTemplateKey?: string | null;
  allowedBlockTypes: string[];
  sourceTemplateId?: string | null;
  sourceTemplateVersionId?: string | null;
  sourcePageBlueprintKey?: string | null;
}) {
  const draftId = `${options.id}-draft`;
  const page: PageRecord = {
    id: options.id,
    siteId: options.siteId,
    pageKey: options.pageKey,
    pageTemplateKey: options.pageTemplateKey ?? options.pageKey,
    sourceTemplateId: options.sourceTemplateId ?? null,
    sourceTemplateVersionId: options.sourceTemplateVersionId ?? null,
    sourcePageBlueprintKey: options.sourcePageBlueprintKey ?? options.pageKey,
    lineageStatus: "INHERITED",
    allowedBlockTypes: options.allowedBlockTypes,
    slug: options.slug,
    title: options.title,
    status: options.publishedContent ? "PUBLISHED" : "DRAFT",
    isVisible: true,
    hierarchyRole: "MAIN",
    defaultParentPageKey: null,
    seoTitle: `${options.title} SEO`,
    seoDescription: `${options.title} description`,
    currentDraftRevisionId: draftId,
    currentPublishedRevisionId: options.publishedContent ? `${options.id}-published` : null,
    createdAt: new Date("2026-06-03T00:00:00.000Z"),
    updatedAt: new Date("2026-06-03T00:00:00.000Z"),
  };

  state.pages.push(page);
  state.revisions.push({
    id: draftId,
    pageId: page.id,
    revisionNumber: 1,
    state: "DRAFT",
    content: clone(options.draftContent),
    schemaVersion: 1,
    checksum: null,
    createdBy: "admin-owner",
    publishedBy: null,
    createdAt: new Date("2026-06-03T00:00:00.000Z"),
    publishedAt: null,
  });

  if (options.publishedContent) {
    state.revisions.push({
      id: `${options.id}-published`,
      pageId: page.id,
      revisionNumber: 2,
      state: "PUBLISHED",
      content: clone(options.publishedContent),
      schemaVersion: 1,
      checksum: null,
      createdBy: "admin-owner",
      publishedBy: "admin-owner",
      createdAt: new Date("2026-06-03T00:05:00.000Z"),
      publishedAt: new Date("2026-06-03T00:05:00.000Z"),
    });
  }
}

function getRevisionById(id: string | null) {
  return id ? state.revisions.find((entry) => entry.id === id) ?? null : null;
}

function hydratePage(page: PageRecord) {
  const site = state.sites.find((entry) => entry.id === page.siteId) ?? null;
  return {
    ...clone(page),
    currentDraftRevision: clone(getRevisionById(page.currentDraftRevisionId)),
    currentPublishedRevision: clone(getRevisionById(page.currentPublishedRevisionId)),
    sourceTemplate: clone(site?.template ?? null),
    sourceTemplateVersion: clone(site?.templateVersion ?? null),
  };
}

function selectFields<T extends object>(source: T, select: Record<string, boolean>) {
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, (source as Record<string, unknown>)[key]])
  );
}

function buildState() {
  const tenantA = { id: "tenant-a", slug: "dsgnfi", name: "Dsgnfi" };
  const tenantB = { id: "tenant-b", slug: "foreign", name: "Foreign" };

  const agencyVersion = makeTemplateVersion({
    id: "version-agency",
    templateId: "template-agency",
    version: "1.0.0",
    isActive: true,
    manifestKey: "agency-starter",
    presetOverrides: null,
  });
  const blitVersion = makeTemplateVersion({
    id: "version-blit",
    templateId: "template-blit",
    version: "1.0.0",
    isActive: true,
    manifestKey: "blit",
    presetOverrides: null,
  });

  const agencyTemplate = makeTemplate({
    id: "template-agency",
    key: "agency-starter",
    name: "Agency Starter",
    category: "agency",
    description: "Agency starter",
    status: "ACTIVE",
    sourceType: "STARTER",
    baseTemplateKey: null,
    versions: [agencyVersion],
  });
  const blitTemplate = makeTemplate({
    id: "template-blit",
    key: "blit",
    name: "Blit",
    category: "agency",
    description: "Blit imported template",
    status: "ACTIVE",
    sourceType: "CUSTOM",
    baseTemplateKey: null,
    versions: [blitVersion],
  });

  state = {
    tenants: [tenantA, tenantB],
    memberships: [
      { userId: "admin-owner", tenantId: tenantA.id, role: "OWNER", createdAt: new Date("2026-06-01T00:00:00.000Z") },
      { userId: "admin-editor", tenantId: tenantA.id, role: "EDITOR", createdAt: new Date("2026-06-01T00:00:00.000Z") },
      { userId: "admin-viewer", tenantId: tenantA.id, role: "VIEWER", createdAt: new Date("2026-06-01T00:00:00.000Z") },
      { userId: "admin-foreign", tenantId: tenantB.id, role: "OWNER", createdAt: new Date("2026-06-01T00:00:00.000Z") },
    ],
    sites: [
      makeSite({
        id: "site-main",
        tenantId: tenantA.id,
        slug: "main",
        name: "Main Site",
        status: "ACTIVE",
        isDefault: true,
        templateId: agencyTemplate.id,
        templateVersionId: agencyVersion.id,
        template: agencyTemplate,
        templateVersion: agencyVersion,
        tenant: tenantA,
      }),
      makeSite({
        id: "site-blit",
        tenantId: tenantA.id,
        slug: "blit",
        name: "Blit Site",
        status: "ACTIVE",
        isDefault: false,
        templateId: blitTemplate.id,
        templateVersionId: blitVersion.id,
        template: blitTemplate,
        templateVersion: blitVersion,
        tenant: tenantA,
      }),
      makeSite({
        id: "site-empty",
        tenantId: tenantA.id,
        slug: "empty",
        name: "Empty Site",
        status: "ACTIVE",
        isDefault: false,
        templateId: agencyTemplate.id,
        templateVersionId: agencyVersion.id,
        template: agencyTemplate,
        templateVersion: agencyVersion,
        tenant: tenantA,
      }),
      makeSite({
        id: "site-foreign",
        tenantId: tenantB.id,
        slug: "foreign",
        name: "Foreign Site",
        status: "ACTIVE",
        isDefault: true,
        templateId: agencyTemplate.id,
        templateVersionId: agencyVersion.id,
        template: agencyTemplate,
        templateVersion: agencyVersion,
        tenant: tenantB,
      }),
    ],
    pages: [],
    revisions: [],
    cmsSections: [],
    workProjects: [],
    auditLogs: [],
  };

  addPage({
    id: "page-main-home",
    siteId: "site-main",
    pageKey: "home",
    slug: "/",
    title: "Home",
    draftContent: contentWithHeadline("Main Draft Home"),
    publishedContent: contentWithHeadline("Main Published Home"),
    allowedBlockTypes: ["hero", "features", "gallery", "faq", "cta", "richText", "stats"],
    sourceTemplateId: agencyTemplate.id,
    sourceTemplateVersionId: agencyVersion.id,
  });
  addPage({
    id: "page-blit-home",
    siteId: "site-blit",
    pageKey: "home",
    slug: "/",
    title: "Blit Home",
    draftContent: blitHomeContent("Draft"),
    publishedContent: blitHomeContent("Published"),
    allowedBlockTypes: [
      "blitHeroCollage",
      "blitFeaturedWork",
      "blitEditorialStatement",
      "blitVideoSection",
      "blitCapabilitiesGrid",
      "blitHorizontalGallery",
      "blitFinalStatement",
    ],
    sourceTemplateId: blitTemplate.id,
    sourceTemplateVersionId: blitVersion.id,
  });
  addPage({
    id: "page-empty-home",
    siteId: "site-empty",
    pageKey: "home",
    slug: "/",
    title: "Empty Home",
    draftContent: contentWithHeadline("Empty Draft Home"),
    publishedContent: contentWithHeadline("Empty Published Home"),
    allowedBlockTypes: ["hero", "features", "gallery", "faq", "cta", "richText", "stats"],
    sourceTemplateId: agencyTemplate.id,
    sourceTemplateVersionId: agencyVersion.id,
  });
  addPage({
    id: "page-foreign-home",
    siteId: "site-foreign",
    pageKey: "home",
    slug: "/",
    title: "Foreign Home",
    draftContent: contentWithHeadline("Foreign Draft Home"),
    publishedContent: contentWithHeadline("Foreign Published Home"),
    allowedBlockTypes: ["hero", "features", "gallery", "faq", "cta", "richText", "stats"],
    sourceTemplateId: agencyTemplate.id,
    sourceTemplateVersionId: agencyVersion.id,
  });

  state.cmsSections.push(
    {
      siteId: "site-main",
      page: "home",
      section: "hero",
      status: "PUBLISHED",
      draftData: {
        headline: "Legacy Main Hero",
        subheadline: "Legacy main subheadline",
        backgroundImageUrl: "/legacy-main.jpg",
        backgroundVideoUrl: "/legacy-main.mp4",
        visible: true,
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:00:00.000Z"),
      publishedAt: new Date("2026-06-05T08:00:00.000Z"),
    },
    {
      siteId: "site-main",
      page: "home",
      section: "services",
      status: "DRAFT",
      draftData: {
        introTitle: "Services",
        introText: "Strategy-led creative work.",
        visible: true,
        categories: [
          { title: "Brand", items: ["Identity", "Positioning"] },
          { title: "Web", items: ["Websites", "Landing pages"] },
          { title: "Campaigns", items: ["Paid ads"] },
          { title: "Content", items: ["Storytelling"] },
        ],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:05:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-main",
      page: "home",
      section: "featuredWork",
      status: "DRAFT",
      draftData: {
        title: "Featured work",
        description: "Selected work",
        count: 1,
        order: "manual",
        manualSlugs: ["main-project"],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:10:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-main",
      page: "home",
      section: "faq",
      status: "DRAFT",
      draftData: {
        visible: true,
        items: [{ question: "How do you work?", answer: "Closely." }],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:15:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-main",
      page: "home",
      section: "cta",
      status: "DRAFT",
      draftData: {
        visible: true,
        title: "Start your next project",
        primaryLabel: "Contact us",
        primaryHref: "/contact",
        secondaryLabel: "See work",
        secondaryHref: "/work",
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:20:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-main",
      page: "home",
      section: "testimonials",
      status: "DRAFT",
      draftData: {
        visible: true,
        title: "Testimonials",
        items: [{ quote: "Sharp work.", author: "Ada", role: "Founder" }],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:25:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-main",
      page: "home",
      section: "awards",
      status: "DRAFT",
      draftData: {
        visible: true,
        eyebrow: "Awards",
        title: "Recognition",
        listTitle: "Latest awards",
        items: [{ year: "2025", title: "Gold", org: "Awwwards" }],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:30:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-main",
      page: "about",
      section: "hero",
      status: "DRAFT",
      draftData: { headline: "Unrelated about hero" },
      publishedData: {},
      updatedAt: new Date("2026-06-05T08:35:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-blit",
      page: "home",
      section: "hero",
      status: "PUBLISHED",
      draftData: {
        headline: "Blit Legacy Hero",
        subheadline: "Blit legacy subheadline",
        backgroundImageUrl: "/blit-legacy.jpg",
        visible: true,
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T09:00:00.000Z"),
      publishedAt: new Date("2026-06-05T09:00:00.000Z"),
    },
    {
      siteId: "site-blit",
      page: "home",
      section: "services",
      status: "DRAFT",
      draftData: {
        introTitle: "Capabilities",
        introText: "Immersive studio work.",
        visible: true,
        categories: [
          { title: "Installations", items: ["Immersive environments"] },
          { title: "Scenography", items: ["Live visuals"] },
          { title: "VR", items: ["Prototype worlds"] },
          { title: "Systems", items: ["Interactive logic"] },
        ],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T09:05:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-blit",
      page: "home",
      section: "featuredWork",
      status: "DRAFT",
      draftData: {
        title: "Selected projects",
        description: "Featured immersive projects",
        count: 1,
        order: "manual",
        manualSlugs: ["blit-project"],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T09:10:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-blit",
      page: "home",
      section: "cta",
      status: "DRAFT",
      draftData: {
        visible: true,
        title: "Build the impossible",
        primaryLabel: "Start",
        primaryHref: "/contact",
        secondaryLabel: "Works",
        secondaryHref: "/works",
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T09:15:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-blit",
      page: "home",
      section: "testimonials",
      status: "DRAFT",
      draftData: {
        visible: true,
        title: "Studio voice",
        items: [{ quote: "Emotionally precise.", author: "Ben", role: "Curator" }],
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T09:20:00.000Z"),
      publishedAt: null,
    },
    {
      siteId: "site-foreign",
      page: "home",
      section: "hero",
      status: "PUBLISHED",
      draftData: {
        headline: "Foreign Legacy Hero",
        subheadline: "Foreign content",
        visible: true,
      },
      publishedData: {},
      updatedAt: new Date("2026-06-05T10:00:00.000Z"),
      publishedAt: new Date("2026-06-05T10:00:00.000Z"),
    }
  );

  state.workProjects.push(
    {
      id: "work-main-1",
      siteId: "site-main",
      templateId: "template-work",
      titleDraft: "Main Project",
      slugDraft: "main-project",
      excerptDraft: "Main excerpt",
      coverImageDraft: "/main-project.jpg",
      draftContent: {},
      titlePublished: "Main Project",
      slugPublished: "main-project",
      excerptPublished: "Main excerpt",
      coverImagePublished: "/main-project.jpg",
      publishedContent: {},
      status: "PUBLISHED",
      publishedAt: new Date("2026-06-04T00:00:00.000Z"),
      createdAt: new Date("2026-06-04T00:00:00.000Z"),
      updatedAt: new Date("2026-06-04T00:00:00.000Z"),
      tags: [{ tag: { name: "Brand", slug: "brand" } }],
    },
    {
      id: "work-blit-1",
      siteId: "site-blit",
      templateId: "template-work",
      titleDraft: "Blit Project",
      slugDraft: "blit-project",
      excerptDraft: "Blit excerpt",
      coverImageDraft: "/blit-project.jpg",
      draftContent: {},
      titlePublished: "Blit Project",
      slugPublished: "blit-project",
      excerptPublished: "Blit excerpt",
      coverImagePublished: "/blit-project.jpg",
      publishedContent: {},
      status: "PUBLISHED",
      publishedAt: new Date("2026-06-04T00:00:00.000Z"),
      createdAt: new Date("2026-06-04T00:00:00.000Z"),
      updatedAt: new Date("2026-06-04T00:00:00.000Z"),
      tags: [{ tag: { name: "Installation", slug: "installation" } }],
    }
  );
}

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  page: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  pageRevision: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  cmsSection: { findMany: vi.fn() },
  workProject: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $queryRawUnsafe: vi.fn(),
  $transaction: vi.fn(),
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

function installPrismaMocks() {
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
    callback(mockPrisma as unknown as typeof mockPrisma)
  );

  mockPrisma.auditLog.create.mockImplementation(async (args: { data: AuditLogRecord }) => {
    state.auditLogs.push(clone(args.data));
    return clone(args.data);
  });

  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.site.findMany.mockResolvedValue([]);

  mockPrisma.membership.findMany.mockImplementation(async (args: any) => {
    const memberships = state.memberships.filter((entry) => entry.userId === args?.where?.userId);
    return memberships.map((membership) => ({
      tenantId: membership.tenantId,
      role: membership.role,
      tenant: {
        ...(state.tenants.find((tenant) => tenant.id === membership.tenantId) as TenantRecord),
        sites: state.sites
          .filter((site) => site.tenantId === membership.tenantId)
          .map((site) => ({
            id: site.id,
            name: site.name,
            slug: site.slug,
            status: site.status,
            isDefault: site.isDefault,
          })),
      },
    }));
  });

  mockPrisma.membership.findFirst.mockImplementation(async (args: any) => {
    const membership = state.memberships.find(
      (entry) =>
        entry.userId === args?.where?.userId &&
        entry.tenantId === args?.where?.tenantId
    );
    return membership ? { tenantId: membership.tenantId, role: membership.role } : null;
  });

  mockPrisma.site.findUnique.mockImplementation(async (args: any) => {
    const site = state.sites.find((entry) => entry.id === args?.where?.id) ?? null;
    return site ? clone(site) : null;
  });

  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    const site = state.sites.find((entry) => {
      if (where.id && entry.id !== where.id) return false;
      if (where.tenantId && entry.tenantId !== where.tenantId) return false;
      if (where.slug && entry.slug !== where.slug) return false;
      if (where.isDefault === true && !entry.isDefault) return false;
      if (where.status?.not && entry.status === where.status.not) return false;
      if (where.tenant?.slug && entry.tenant.slug !== where.tenant.slug) return false;
      return true;
    });
    return site ? clone(site) : null;
  });

  mockPrisma.page.findUnique.mockImplementation(async (args: any) => {
    const key = args?.where?.siteId_pageKey;
    const page = key
      ? state.pages.find((entry) => entry.siteId === key.siteId && entry.pageKey === key.pageKey) ?? null
      : args?.where?.id
      ? state.pages.find((entry) => entry.id === args.where.id) ?? null
      : null;

    if (!page) return null;
    if (args?.select) return selectFields(page, args.select);
    if (args?.include) return hydratePage(page);
    return clone(page);
  });

  mockPrisma.page.findMany.mockImplementation(async (args: any) => {
    const pages = state.pages.filter((entry) => {
      if (args?.where?.siteId && entry.siteId !== args.where.siteId) return false;
      return true;
    });
    return args?.include ? pages.map((page) => hydratePage(page)) : clone(pages);
  });

  mockPrisma.page.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    const page = state.pages.find((entry) => {
      if (where.siteId && entry.siteId !== where.siteId) return false;
      if (where.slug && entry.slug !== where.slug) return false;
      if (where.pageKey && entry.pageKey !== where.pageKey) return false;
      return true;
    }) ?? null;

    if (!page) return null;
    if (args?.select) return selectFields(page, args.select);
    if (args?.include) return hydratePage(page);
    return clone(page);
  });

  mockPrisma.page.update.mockImplementation(async (args: any) => {
    const page = state.pages.find((entry) => entry.id === args?.where?.id) ?? null;
    if (!page) return null;
    Object.assign(page, clone(args.data), { updatedAt: new Date("2026-06-06T00:00:00.000Z") });
    return args?.include ? hydratePage(page) : clone(page);
  });

  mockPrisma.page.create.mockImplementation(async (args: any) => {
    const page: PageRecord = {
      id: args?.data?.id ?? `page-created`,
      siteId: args.data.siteId,
      pageKey: args.data.pageKey,
      pageTemplateKey: args.data.pageTemplateKey ?? null,
      sourceTemplateId: args.data.sourceTemplateId ?? null,
      sourceTemplateVersionId: args.data.sourceTemplateVersionId ?? null,
      sourcePageBlueprintKey: args.data.sourcePageBlueprintKey ?? null,
      lineageStatus: args.data.lineageStatus ?? "UNTRACKED",
      allowedBlockTypes: args.data.allowedBlockTypes ?? [],
      slug: args.data.slug,
      title: args.data.title,
      status: args.data.status,
      isVisible: args.data.isVisible ?? true,
      hierarchyRole: args.data.hierarchyRole ?? "MAIN",
      defaultParentPageKey: args.data.defaultParentPageKey ?? null,
      seoTitle: args.data.seoTitle ?? null,
      seoDescription: args.data.seoDescription ?? null,
      currentDraftRevisionId: null,
      currentPublishedRevisionId: null,
      createdAt: new Date("2026-06-06T00:00:00.000Z"),
      updatedAt: new Date("2026-06-06T00:00:00.000Z"),
    };
    state.pages.push(page);
    return clone(page);
  });

  mockPrisma.pageRevision.findFirst.mockImplementation(async (args: any) => {
    let revisions = state.revisions.filter((entry) => {
      if (args?.where?.pageId && entry.pageId !== args.where.pageId) return false;
      if (args?.where?.id && entry.id !== args.where.id) return false;
      return true;
    });
    if (args?.orderBy?.revisionNumber === "desc") {
      revisions = revisions.sort((left, right) => right.revisionNumber - left.revisionNumber);
    }
    return clone(revisions[0] ?? null);
  });

  mockPrisma.pageRevision.findMany.mockImplementation(async (args: any) => {
    const revisions = state.revisions
      .filter((entry) => (args?.where?.pageId ? entry.pageId === args.where.pageId : true))
      .sort((left, right) => right.revisionNumber - left.revisionNumber);
    return args?.select ? revisions.map((entry) => selectFields(entry, args.select)) : clone(revisions);
  });

  mockPrisma.pageRevision.create.mockImplementation(async (args: any) => {
    const revision: RevisionRecord = {
      id: args?.data?.id ?? `revision-${revisionCounter++}`,
      pageId: args.data.pageId,
      revisionNumber: args.data.revisionNumber,
      state: args.data.state,
      content: clone(args.data.content),
      schemaVersion: args.data.schemaVersion,
      checksum: args.data.checksum ?? null,
      createdBy: args.data.createdBy ?? null,
      publishedBy: args.data.publishedBy ?? null,
      createdAt: new Date("2026-06-06T00:00:00.000Z"),
      publishedAt: args.data.publishedAt ?? null,
    };
    state.revisions.push(revision);
    return clone(revision);
  });

  mockPrisma.cmsSection.findMany.mockImplementation(async (args: any) => {
    const sections = state.cmsSections.filter((entry) => {
      if (args?.where?.siteId && entry.siteId !== args.where.siteId) return false;
      if (args?.where?.page && entry.page !== args.where.page) return false;
      if (args?.where?.section?.in && !args.where.section.in.includes(entry.section)) return false;
      return true;
    });
    return args?.select ? sections.map((entry) => selectFields(entry, args.select)) : clone(sections);
  });

  mockPrisma.workProject.findMany.mockImplementation(async (args: any) => {
    const projects = state.workProjects.filter((entry) => {
      if (args?.where?.siteId && entry.siteId !== args.where.siteId) return false;
      return true;
    });
    return clone(projects);
  });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

function cookieFor(userId: "admin-owner" | "admin-editor" | "admin-viewer" | "admin-foreign", siteId: string) {
  const tenantId = userId === "admin-foreign" ? "tenant-b" : "tenant-a";
  const email =
    userId === "admin-owner"
      ? "owner@dsgnfi.com"
      : userId === "admin-editor"
      ? "editor@dsgnfi.com"
      : userId === "admin-viewer"
      ? "viewer@dsgnfi.com"
      : "foreign@dsgnfi.com";
  return [`cms_token=${signAdminToken({ id: userId, email, tenantId, siteId })}`];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  revisionCounter = 100;
  buildState();
  installPrismaMocks();
});

describe("legacy home migration routes", () => {
  it("preview returns the migration contract, writes audit, and creates no revision", async () => {
    const app = await createTestApp();
    const originalPageRevisionCount = state.revisions.filter(
      (entry) => entry.pageId === "page-main-home"
    ).length;
    const originalDraftPointer = state.pages.find((entry) => entry.id === "page-main-home")?.currentDraftRevisionId;
    const originalPublishedPointer = state.pages.find((entry) => entry.id === "page-main-home")?.currentPublishedRevisionId;
    const originalSections = clone(state.cmsSections.filter((entry) => entry.siteId === "site-main"));

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-main"));

    expect(response.status).toBe(200);
    expect(response.body.preview).toMatchObject({
      pageKey: "home",
      source: { legacySectionCount: 7 },
      sourceFingerprint: expect.any(String),
      generatedAt: expect.any(String),
    });
    expect(response.body.preview.supportedMappings.length).toBeGreaterThan(0);
    expect(response.body.preview.proposedContent.blocks.length).toBeGreaterThan(0);
    expect(response.body.preview.unsupportedItems.some((item: any) => item.fieldKey === "backgroundVideoUrl")).toBe(true);
    expect(
      state.revisions.filter((entry) => entry.pageId === "page-main-home")
    ).toHaveLength(originalPageRevisionCount);
    expect(state.pages.find((entry) => entry.id === "page-main-home")?.currentDraftRevisionId).toBe(originalDraftPointer);
    expect(state.pages.find((entry) => entry.id === "page-main-home")?.currentPublishedRevisionId).toBe(originalPublishedPointer);
    expect(state.cmsSections.filter((entry) => entry.siteId === "site-main")).toEqual(originalSections);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.preview_generated",
      siteId: "site-main",
    });
  });

  it("preview is rejected for unauthenticated and viewer requests", async () => {
    const app = await createTestApp();

    const anonymous = await request(app).post("/admin/pages/home/legacy-migration/preview");
    expect(anonymous.status).toBe(401);

    const viewer = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-viewer", "site-main"));
    expect(viewer.status).toBe(403);
  });

  it("preview is site-scoped and cross-tenant header overrides are ignored", async () => {
    const app = await createTestApp();

    const foreign = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-foreign", "site-foreign"))
      .set("x-site-id", "site-main");

    expect(foreign.status).toBe(200);
    expect(foreign.body.preview.source.legacySectionCount).toBe(1);
    expect(foreign.body.preview.supportedMappings).toHaveLength(1);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.preview_generated",
      siteId: "site-foreign",
    });

    const tokenWins = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-main"))
      .set("x-site-id", "site-blit");

    expect(tokenWins.status).toBe(200);
    expect(tokenWins.body.preview.source.legacySectionCount).toBe(7);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.preview_generated",
      siteId: "site-main",
    });

    const headerOverrideCookie = [
      `cms_token=${signAdminToken({
        id: "admin-owner",
        email: "owner@dsgnfi.com",
        tenantId: "tenant-a",
        siteId: "site-missing",
      })}`,
    ];
    const blit = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", headerOverrideCookie)
      .set("x-site-id", "site-blit");

    expect(blit.status).toBe(200);
    const blitAllowedTypes =
      state.pages.find((entry) => entry.id === "page-blit-home")?.allowedBlockTypes ?? [];
    expect(
      blit.body.preview.proposedContent.blocks.every((block: any) =>
        blitAllowedTypes.includes(String(block.type))
      )
    ).toBe(true);
    expect(
      blit.body.preview.proposedContent.blocks.some((block: any) =>
        String(block.type).startsWith("blit")
      )
    ).toBe(true);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.preview_generated",
      siteId: "site-blit",
    });
  });

  it("preview returns a controlled error when legacy homepage content is empty", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-empty"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("legacy_migration_empty");
  });

  it("apply accepts a valid Blit preview and preserves the published revision pointer", async () => {
    const app = await createTestApp();
    const preview = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-blit"));

    expect(preview.status).toBe(200);
    expect(
      preview.body.preview.proposedContent.blocks.some((block: any) => block.type === "blitVideoSection")
    ).toBe(true);
    expect(
      preview.body.preview.proposedContent.blocks.some(
        (block: any) => block.type === "blitHorizontalGallery"
      )
    ).toBe(true);

    const beforePage = state.pages.find((entry) => entry.id === "page-blit-home");
    const beforePublishedPointer = beforePage?.currentPublishedRevisionId ?? null;
    const beforeRevisionCount = state.revisions.length;
    const publishedBefore = await request(app).get("/public/pages/home").query({ siteId: "site-blit" });

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-owner", "site-blit"))
      .send({
        sourceFingerprint: preview.body.preview.sourceFingerprint,
        proposedContent: preview.body.preview.proposedContent,
      });

    expect(response.status).toBe(200);
    expect(response.body.page.pageKey).toBe("home");
    expect(response.body.page.draftRevisionNumber).toBeGreaterThan(1);
    expect(state.revisions.length).toBe(beforeRevisionCount + 1);
    expect(state.pages.find((entry) => entry.id === "page-blit-home")?.currentPublishedRevisionId).toBe(
      beforePublishedPointer
    );
    expect(
      response.body.page.content.blocks.some((block: any) => block.type === "blitVideoSection")
    ).toBe(true);
    expect(
      response.body.page.content.blocks.some((block: any) => block.type === "blitHorizontalGallery")
    ).toBe(true);

    const publishedAfter = await request(app).get("/public/pages/home").query({ siteId: "site-blit" });
    expect(publishedAfter.status).toBe(200);
    expect(publishedAfter.body.page.revisionNumber).toBe(publishedBefore.body.page.revisionNumber);
    expect(publishedAfter.body.page.content).toEqual(publishedBefore.body.page.content);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.applied",
      siteId: "site-blit",
    });
  });

  it("apply creates a new draft revision, preserves published content, and writes audit", async () => {
    const app = await createTestApp();
    const preview = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-main"));

    const originalPublishedPointer =
      state.pages.find((entry) => entry.id === "page-main-home")?.currentPublishedRevisionId ?? null;
    const originalPublishedHeadline = (
      await request(app).get("/public/pages/home")
    ).body.page.content.blocks[0].data.headline;
    const originalRevisionCount = state.revisions.length;

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-owner", "site-main"))
      .send({
        sourceFingerprint: preview.body.preview.sourceFingerprint,
        proposedContent: preview.body.preview.proposedContent,
      });

    expect(response.status).toBe(200);
    expect(response.body.page.pageKey).toBe("home");
    expect(response.body.page.draftRevisionNumber).toBeGreaterThan(1);
    expect(response.body.page.publishedRevisionNumber).toBe(2);
    expect(state.revisions.length).toBe(originalRevisionCount + 1);
    expect(state.pages.find((entry) => entry.id === "page-main-home")?.currentPublishedRevisionId).toBe(
      originalPublishedPointer
    );
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.applied",
      siteId: "site-main",
    });

    const publicAfterApply = await request(app).get("/public/pages/home");
    expect(publicAfterApply.status).toBe(200);
    expect(publicAfterApply.body.page.content.blocks[0].data.headline).toBe(originalPublishedHeadline);
    expect(publicAfterApply.body.page.content.blocks[0].data.headline).not.toBe(
      response.body.page.content.blocks[0].data.headline
    );
  });

  it("apply rejects invalid input, viewer access, and cross-tenant site overrides", async () => {
    const app = await createTestApp();

    const missingFingerprint = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-owner", "site-main"))
      .send({ proposedContent: { blocks: [] } });
    expect(missingFingerprint.status).toBe(400);

    const viewer = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-viewer", "site-main"))
      .send({ sourceFingerprint: "x".repeat(16), proposedContent: { blocks: [] } });
    expect(viewer.status).toBe(403);

    const foreign = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-foreign", "site-foreign"))
      .set("x-site-id", "site-main")
      .send({ sourceFingerprint: "x".repeat(16), proposedContent: { blocks: [] } });
    expect(foreign.status).toBe(409);
    expect(foreign.body.error.code).toBe("LEGACY_MIGRATION_SOURCE_CHANGED");
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.rejected_stale_source",
      siteId: "site-foreign",
    });
  });

  it("apply rejects stale fingerprints without creating revisions and records the stale audit event", async () => {
    const app = await createTestApp();
    const preview = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-main"));

    const beforeCount = state.revisions.length;
    const heroSection = state.cmsSections.find(
      (entry) => entry.siteId === "site-main" && entry.page === "home" && entry.section === "hero"
    );
    if (!heroSection) {
      throw new Error("Missing hero section");
    }
    heroSection.draftData.headline = "Changed after preview";
    heroSection.updatedAt = new Date("2026-06-07T00:00:00.000Z");

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-owner", "site-main"))
      .send({
        sourceFingerprint: preview.body.preview.sourceFingerprint,
        proposedContent: preview.body.preview.proposedContent,
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("LEGACY_MIGRATION_SOURCE_CHANGED");
    expect(state.revisions).toHaveLength(beforeCount);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.rejected_stale_source",
      siteId: "site-main",
    });
  });

  it("apply rejects unsupported block types from the client payload", async () => {
    const app = await createTestApp();
    const preview = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-main"));

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-owner", "site-main"))
      .send({
        sourceFingerprint: preview.body.preview.sourceFingerprint,
        proposedContent: {
          blocks: [
            ...preview.body.preview.proposedContent.blocks,
            { id: "bad-1", type: "unknownBlock", data: {} },
          ],
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("legacy_migration_invalid_preview");
  });

  it("apply rejects invalid Blit preview payloads with the intended validation response", async () => {
    const app = await createTestApp();
    const preview = await request(app)
      .post("/admin/pages/home/legacy-migration/preview")
      .set("Cookie", cookieFor("admin-owner", "site-blit"));

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/apply")
      .set("Cookie", cookieFor("admin-owner", "site-blit"))
      .send({
        sourceFingerprint: preview.body.preview.sourceFingerprint,
        proposedContent: {
          blocks: preview.body.preview.proposedContent.blocks.map((block: any) =>
            block.type === "blitVideoSection"
              ? {
                  ...block,
                  data: {
                    ...block.data,
                    videoUrl: ["broken"],
                  },
                }
              : block
          ),
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("legacy_migration_invalid_preview");
  });

  it("cancel records the admin decision and changes no page or legacy content", async () => {
    const app = await createTestApp();
    const beforeRevisionCount = state.revisions.length;
    const beforeDraftPointer =
      state.pages.find((entry) => entry.id === "page-main-home")?.currentDraftRevisionId ?? null;
    const beforePublishedPointer =
      state.pages.find((entry) => entry.id === "page-main-home")?.currentPublishedRevisionId ?? null;
    const beforeSections = clone(state.cmsSections.filter((entry) => entry.siteId === "site-main"));

    const response = await request(app)
      .post("/admin/pages/home/legacy-migration/cancel")
      .set("Cookie", cookieFor("admin-owner", "site-main"))
      .send({ sourceFingerprint: "preview-fingerprint" });

    expect(response.status).toBe(200);
    expect(state.revisions).toHaveLength(beforeRevisionCount);
    expect(state.pages.find((entry) => entry.id === "page-main-home")?.currentDraftRevisionId).toBe(
      beforeDraftPointer
    );
    expect(state.pages.find((entry) => entry.id === "page-main-home")?.currentPublishedRevisionId).toBe(
      beforePublishedPointer
    );
    expect(state.cmsSections.filter((entry) => entry.siteId === "site-main")).toEqual(beforeSections);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.cancelled",
      siteId: "site-main",
      metadata: { pageKey: "home", sourceFingerprint: "preview-fingerprint" },
    });
  });

  it("cancel is rejected for viewer and cross-tenant requests", async () => {
    const app = await createTestApp();

    const viewer = await request(app)
      .post("/admin/pages/home/legacy-migration/cancel")
      .set("Cookie", cookieFor("admin-viewer", "site-main"));
    expect(viewer.status).toBe(403);

    const foreign = await request(app)
      .post("/admin/pages/home/legacy-migration/cancel")
      .set("Cookie", cookieFor("admin-foreign", "site-foreign"))
      .set("x-site-id", "site-main")
      .send({ sourceFingerprint: "foreign-preview-fingerprint" });
    expect(foreign.status).toBe(200);
    expect(state.auditLogs.at(-1)).toMatchObject({
      action: "legacy_home_migration.cancelled",
      siteId: "site-foreign",
      metadata: {
        pageKey: "home",
        sourceFingerprint: "foreign-preview-fingerprint",
      },
    });
  });
});
