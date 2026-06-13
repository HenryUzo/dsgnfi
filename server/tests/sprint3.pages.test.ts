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

type SiteRecord = {
  id: string;
  tenantId: string;
  templateId: string | null;
  templateVersionId: string | null;
  slug: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  template: {
    id: string;
    key: string;
    name: string;
    category: string;
    description: string;
    status: "ACTIVE" | "INACTIVE";
    sourceType: "STARTER" | "CUSTOM";
    baseTemplateKey: string | null;
    draftPresetOverrides?: unknown;
    draftName?: string | null;
    draftCategory?: string | null;
    draftDescription?: string | null;
    versions: TemplateVersionRecord[];
  } | null;
  templateVersion: TemplateVersionRecord | null;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
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

type RevisionState = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type RevisionRecord = {
  id: string;
  pageId: string;
  revisionNumber: number;
  state: RevisionState;
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

type State = {
  sites: SiteRecord[];
  pages: PageRecord[];
  revisions: RevisionRecord[];
  cmsSections: Array<{
    siteId: string;
    page: string;
    section: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: Date | null;
  }>;
};

let state: State;
let pageCounter = 100;
let revisionCounter = 100;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function signAdminToken(payload: {
  id: string;
  email: string;
  tenantId?: string;
  siteId?: string;
}) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
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
          primaryCtaLabel: "Get Started",
          primaryCtaHref: "/contact",
        },
      },
    ],
  };
}

function makeSite(input: Omit<SiteRecord, "createdAt" | "updatedAt">): SiteRecord {
  return {
    ...input,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z"),
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
  allowedBlockTypes?: string[];
  isVisible?: boolean;
  hierarchyRole?: "MAIN" | "INNER";
  defaultParentPageKey?: string | null;
  sourceTemplateId?: string | null;
  sourceTemplateVersionId?: string | null;
  sourcePageBlueprintKey?: string | null;
  lineageStatus?: "UNTRACKED" | "INHERITED" | "MODIFIED";
}) {
  const draftId = `${options.id}-draft`;
  const page: PageRecord = {
    id: options.id,
    siteId: options.siteId,
    pageKey: options.pageKey,
    pageTemplateKey: options.pageTemplateKey ?? options.pageKey,
    sourceTemplateId: options.sourceTemplateId ?? null,
    sourceTemplateVersionId: options.sourceTemplateVersionId ?? null,
    sourcePageBlueprintKey: options.sourcePageBlueprintKey ?? null,
    lineageStatus: options.lineageStatus ?? "UNTRACKED",
    allowedBlockTypes: options.allowedBlockTypes ?? ["hero", "richText", "stats", "gallery", "cta", "contact"],
    slug: options.slug,
    title: options.title,
    status: options.publishedContent ? "PUBLISHED" : "DRAFT",
    isVisible: options.isVisible ?? true,
    hierarchyRole: options.hierarchyRole ?? "MAIN",
    defaultParentPageKey: options.defaultParentPageKey ?? null,
    seoTitle: options.title,
    seoDescription: `${options.title} description`,
    currentDraftRevisionId: draftId,
    currentPublishedRevisionId: options.publishedContent
      ? `${options.id}-published`
      : null,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z"),
  };

  const revisions: RevisionRecord[] = [
    {
      id: draftId,
      pageId: options.id,
      revisionNumber: 1,
      state: "DRAFT",
      content: clone(options.draftContent),
      schemaVersion: 1,
      checksum: null,
      createdBy: "admin-1",
      publishedBy: null,
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      publishedAt: null,
    },
  ];

  if (options.publishedContent) {
    revisions.push({
      id: `${options.id}-published`,
      pageId: options.id,
      revisionNumber: 2,
      state: "PUBLISHED",
      content: clone(options.publishedContent),
      schemaVersion: 1,
      checksum: null,
      createdBy: "admin-1",
      publishedBy: "admin-1",
      createdAt: new Date("2026-04-05T00:10:00.000Z"),
      publishedAt: new Date("2026-04-05T00:10:00.000Z"),
    });
  }

  state.pages.push(page);
  state.revisions.push(...revisions);
}

function getRevisionById(id: string | null) {
  return id ? state.revisions.find((revision) => revision.id === id) ?? null : null;
}

function getTemplateById(id: string | null) {
  return id
    ? state.sites.find((site) => site.template?.id === id)?.template ?? null
    : null;
}

function getTemplateVersionById(id: string | null) {
  return id
    ? state.sites.find((site) => site.templateVersion?.id === id)?.templateVersion ?? null
    : null;
}

function hydratePage(page: PageRecord) {
  return {
    ...clone(page),
    currentDraftRevision: clone(getRevisionById(page.currentDraftRevisionId)),
    currentPublishedRevision: clone(getRevisionById(page.currentPublishedRevisionId)),
    sourceTemplate: clone(getTemplateById(page.sourceTemplateId)),
    sourceTemplateVersion: clone(getTemplateVersionById(page.sourceTemplateVersionId)),
  };
}

function selectFields<T extends object>(source: T, select: Record<string, boolean>) {
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, (source as Record<string, unknown>)[key]])
  );
}

function buildState(): State {
  const tenant = { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" };
  const otherTenant = { id: "tenant-2", slug: "other", name: "Other" };
  const agencyVersion: TemplateVersionRecord = {
    id: "version-agency",
    templateId: "template-agency",
    version: "1.0.0",
    isActive: true,
    manifestKey: "agency-starter",
    presetOverrides: null,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z"),
  };
  const clinicVersion: TemplateVersionRecord = {
    id: "version-clinic",
    templateId: "template-clinic",
    version: "1.0.0",
    isActive: true,
    manifestKey: "clinic-starter",
    presetOverrides: null,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z"),
  };

  const agencyTemplate = {
    id: "template-agency",
    key: "agency-starter",
    sourceType: "STARTER" as const,
    baseTemplateKey: null,
    name: "Agency Starter",
    category: "agency",
    description: "Agency template",
    status: "ACTIVE" as const,
    versions: [agencyVersion],
  };

  const clinicTemplate = {
    id: "template-clinic",
    key: "clinic-starter",
    sourceType: "STARTER" as const,
    baseTemplateKey: null,
    name: "Clinic Starter",
    category: "healthcare",
    description: "Clinic template",
    status: "ACTIVE" as const,
    versions: [clinicVersion],
  };

  const nextState: State = {
    sites: [
      makeSite({
        id: "site-main",
        tenantId: tenant.id,
        templateId: agencyTemplate.id,
        templateVersionId: agencyVersion.id,
        slug: "main",
        name: "Main Site",
        status: "ACTIVE",
        isDefault: true,
        template: agencyTemplate,
        templateVersion: agencyVersion,
        tenant,
      }),
      makeSite({
        id: "site-branch",
        tenantId: tenant.id,
        templateId: agencyTemplate.id,
        templateVersionId: agencyVersion.id,
        slug: "branch",
        name: "Branch Site",
        status: "ACTIVE",
        isDefault: false,
        template: agencyTemplate,
        templateVersion: agencyVersion,
        tenant,
      }),
      makeSite({
        id: "site-clinic",
        tenantId: tenant.id,
        templateId: clinicTemplate.id,
        templateVersionId: clinicVersion.id,
        slug: "clinic",
        name: "Clinic Site",
        status: "DRAFT",
        isDefault: false,
        template: clinicTemplate,
        templateVersion: clinicVersion,
        tenant,
      }),
      makeSite({
        id: "site-foreign",
        tenantId: otherTenant.id,
        templateId: agencyTemplate.id,
        templateVersionId: agencyVersion.id,
        slug: "foreign",
        name: "Foreign Site",
        status: "ACTIVE",
        isDefault: true,
        template: agencyTemplate,
        templateVersion: agencyVersion,
        tenant: otherTenant,
      }),
    ],
    pages: [],
    revisions: [],
    cmsSections: [],
  };

  state = nextState;

  addPage({
    id: "page-main-home",
    siteId: "site-main",
    pageKey: "home",
    slug: "/",
    title: "Main Home",
    draftContent: contentWithHeadline("Main Draft Home"),
    publishedContent: contentWithHeadline("Main Published Home"),
  });

  addPage({
    id: "page-main-about",
    siteId: "site-main",
    pageKey: "about",
    slug: "/about",
    title: "About",
    draftContent: {
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: { headline: "About Main", subheadline: "About the main site" },
        },
      ],
    },
  });

  addPage({
    id: "page-main-contact",
    siteId: "site-main",
    pageKey: "contact",
    slug: "/contact",
    title: "Contact",
    draftContent: {
      blocks: [
        {
          id: "contact-1",
          type: "contact",
          data: {
            heading: "Contact us",
            email: "hello@example.com",
            phone: "",
            address: "",
            formEnabled: true,
          },
        },
      ],
    },
  });

  addPage({
    id: "page-main-process",
    siteId: "site-main",
    pageKey: "process",
    slug: "/process",
    title: "Process",
    draftContent: {
      blocks: [
        {
          id: "richtext-1",
          type: "richText",
          data: { title: "Process", body: "Our process" },
        },
      ],
    },
  });

  addPage({
    id: "page-main-work",
    siteId: "site-main",
    pageKey: "work",
    slug: "/work",
    title: "Work",
    draftContent: {
      blocks: [
        {
          id: "richtext-1",
          type: "richText",
          data: { title: "Work", body: "Selected work" },
        },
      ],
    },
  });

  addPage({
    id: "page-branch-home",
    siteId: "site-branch",
    pageKey: "home",
    slug: "/",
    title: "Branch Home",
    draftContent: contentWithHeadline("Branch Draft Home"),
    publishedContent: contentWithHeadline("Branch Published Home"),
  });

  addPage({
    id: "page-clinic-home",
    siteId: "site-clinic",
    pageKey: "home",
    slug: "/",
    title: "Clinic Home",
    draftContent: contentWithHeadline("Clinic Draft Home"),
  });

  addPage({
    id: "page-clinic-process",
    siteId: "site-clinic",
    pageKey: "process",
    slug: "/process",
    title: "Clinic Process",
    draftContent: {
      blocks: [
        {
          id: "richtext-1",
          type: "richText",
          data: { title: "Clinic Process", body: "Clinic process" },
        },
      ],
    },
  });

  return nextState;
}

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  page: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  pageRevision: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  cmsSection: { findMany: vi.fn() },
  $queryRawUnsafe: vi.fn(),
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

function installPrismaMocks() {
  mockPrisma.siteDomain.findFirst.mockImplementation(async () => null);

  mockPrisma.membership.findMany.mockImplementation(async (args: any) => {
    if (args?.where?.userId !== "admin-1") {
      return [];
    }

    return [
      {
        tenantId: "tenant-1",
        role: "OWNER",
        tenant: {
          id: "tenant-1",
          slug: "dsgnfi",
          name: "Dsgnfi",
          sites: state.sites
            .filter((site) => site.tenantId === "tenant-1")
            .map((site) => ({
              id: site.id,
              name: site.name,
              slug: site.slug,
              status: site.status,
              isDefault: site.isDefault,
            })),
        },
      },
    ];
  });

  mockPrisma.membership.findFirst.mockImplementation(async (args: any) => {
    if (args?.where?.userId === "admin-1" && args?.where?.tenantId === "tenant-1") {
      return { tenantId: "tenant-1", role: "OWNER" };
    }

    return null;
  });

  mockPrisma.site.findUnique.mockImplementation(async (args: any) => {
    const siteId = args?.where?.id;
    const site = state.sites.find((entry) => entry.id === siteId);
    if (!site) {
      return null;
    }

    return clone(site);
  });

  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};

    if (where.tenantId && where.isDefault === true) {
      return clone(
        state.sites.find(
          (site) => site.tenantId === where.tenantId && site.isDefault
        ) ?? null
      );
    }

    if (where.slug && where.tenant?.slug) {
      return clone(
        state.sites.find(
          (site) => site.slug === where.slug && site.tenant.slug === where.tenant.slug
        ) ?? null
      );
    }

    if (where.slug) {
      return clone(state.sites.find((site) => site.slug === where.slug) ?? null);
    }

    if (where.isDefault === true) {
      return clone(state.sites.find((site) => site.isDefault) ?? null);
    }

    return null;
  });

  mockPrisma.site.findMany.mockResolvedValue([]);

  mockPrisma.page.findUnique.mockImplementation(async (args: any) => {
    const key = args?.where?.siteId_pageKey;
    if (!key) {
      return null;
    }

    const page = state.pages.find(
      (entry) => entry.siteId === key.siteId && entry.pageKey === key.pageKey
    );

    if (!page) {
      return null;
    }

    if (args.select) {
      return selectFields(page, args.select);
    }

    if (args.include) {
      return hydratePage(page);
    }

    return clone(page);
  });

  mockPrisma.page.findMany.mockImplementation(async (args: any) => {
    const siteId = args?.where?.siteId;
    return state.pages
      .filter((page) => (siteId ? page.siteId === siteId : true))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((page) =>
        args?.include ? hydratePage(page) : clone(page)
      );
  });

  mockPrisma.page.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    const page = state.pages.find((entry) => {
      if (where.siteId && entry.siteId !== where.siteId) {
        return false;
      }

      if (where.slug && entry.slug !== where.slug) {
        return false;
      }

      return true;
    });

    if (!page) {
      return null;
    }

    if (args?.select) {
      return selectFields(page, args.select);
    }

    if (args?.include) {
      return hydratePage(page);
    }

    return clone(page);
  });

  mockPrisma.page.create.mockImplementation(async (args: any) => {
    const page: PageRecord = {
      id: args?.data?.id ?? `page-${pageCounter++}`,
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
      createdAt: new Date("2026-04-05T01:00:00.000Z"),
      updatedAt: new Date("2026-04-05T01:00:00.000Z"),
    };

    state.pages.push(page);
    return clone(page);
  });

  mockPrisma.page.update.mockImplementation(async (args: any) => {
    const page = state.pages.find((entry) => entry.id === args.where.id);
    if (!page) {
      return null;
    }

    Object.assign(page, args.data, { updatedAt: new Date("2026-04-05T01:05:00.000Z") });

    if (args.include) {
      return hydratePage(page);
    }

    return clone(page);
  });

  mockPrisma.pageRevision.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    let revisions = state.revisions.filter((revision) => {
      if (where.pageId && revision.pageId !== where.pageId) {
        return false;
      }

      if (where.id && revision.id !== where.id) {
        return false;
      }

      return true;
    });

    if (args?.orderBy?.revisionNumber === "desc") {
      revisions = revisions.sort((left, right) => right.revisionNumber - left.revisionNumber);
    }

    return clone(revisions[0] ?? null);
  });

  mockPrisma.pageRevision.findMany.mockImplementation(async (args: any) => {
    const pageId = args?.where?.pageId;
    const revisions = state.revisions
      .filter((revision) => (pageId ? revision.pageId === pageId : true))
      .sort((left, right) => right.revisionNumber - left.revisionNumber);

    if (args?.select) {
      return revisions.map((revision) => selectFields(revision, args.select));
    }

    return clone(revisions);
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
      createdAt: new Date("2026-04-05T01:10:00.000Z"),
      publishedAt: args.data.publishedAt ?? null,
    };

    state.revisions.push(revision);
    return clone(revision);
  });

  mockPrisma.cmsSection.findMany.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    const sections = state.cmsSections.filter((section) => {
      if (where.siteId && section.siteId !== where.siteId) {
        return false;
      }
      if (where.page && section.page !== where.page) {
        return false;
      }
      if (where.section?.in && !where.section.in.includes(section.section)) {
        return false;
      }
      return true;
    });

    if (args?.select) {
      return sections.map((section) => selectFields(section, args.select));
    }

    return clone(sections);
  });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  pageCounter = 100;
  revisionCounter = 100;
  buildState();
  installPrismaMocks();
});

describe("Sprint 3 page routes", () => {
  it("GET /admin/pages returns pages for the current site only", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.pages.every((page: any) => page.id.startsWith("page-main-"))).toBe(
      true
    );
    const homePage = response.body.pages.find((page: any) => page.pageKey === "home");
    expect(homePage.lineage).toMatchObject({
      sourceTemplateKey: "agency-starter",
      sourceTemplateVersion: "1.0.0",
      sourcePageBlueprintKey: "home",
      isTracked: true,
    });
  }, 30000);

  it("GET /admin/pages/catalog returns template-approved addable page templates", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages/catalog")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.templates.length).toBeGreaterThan(0);
    expect(response.body.templates[0]).toHaveProperty("templateKey");
    expect(
      response.body.templates.some(
        (template: { templateKey: string }) => template.templateKey === "studio-profile"
      )
    ).toBe(true);
  }, 10000);

  it("GET /admin/pages/catalog falls back to common templates for sites without a template", async () => {
    const mainSite = state.sites.find((site) => site.id === "site-main");
    if (!mainSite) {
      throw new Error("Missing main site setup");
    }

    mainSite.template = null;
    mainSite.templateId = null;
    mainSite.templateVersion = null;
    mainSite.templateVersionId = null;
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages/catalog")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.templates.length).toBeGreaterThan(0);
    expect(response.body.templates.some((template: any) => template.templateKey === "standard-content")).toBe(true);
  });

  it("POST /admin/pages creates a template-approved page draft for the active site", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/pages")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        templateKey: "standard-content",
        title: "Team",
        slug: "/team",
        seoTitle: "Team | DSGNFI",
        isVisible: false,
        hierarchyRole: "MAIN",
        defaultParentPageKey: null,
      });

    expect(response.status).toBe(201);
    expect(response.body.page.pageKey).toBe("custom__team");
    expect(response.body.page.slug).toBe("/team");
    expect(response.body.page.seoTitle).toBe("Team | DSGNFI");
    expect(response.body.page.isVisible).toBe(false);
    expect(response.body.page.hierarchy).toMatchObject({
      role: "MAIN",
      defaultParentPageKey: null,
      defaultParentTitle: null,
      defaultParentSlug: null,
    });
    expect(response.body.page.lineage).toMatchObject({
      sourceTemplateKey: "agency-starter",
      sourceTemplateVersion: "1.0.0",
      sourcePageBlueprintKey: "standard-content",
      status: "INHERITED",
      isTracked: true,
    });
    const createdPage = state.pages.find(
      (page) => page.siteId === "site-main" && page.pageKey === "custom__team"
    );
    expect(createdPage).toMatchObject({
      sourceTemplateId: "template-agency",
      sourceTemplateVersionId: "version-agency",
      sourcePageBlueprintKey: "standard-content",
      lineageStatus: "INHERITED",
      seoTitle: "Team | DSGNFI",
      isVisible: false,
      hierarchyRole: "MAIN",
      defaultParentPageKey: null,
    });
  });

  it("GET /admin/pages/:pageKey/draft returns the correct draft for the active site", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages/home/draft")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.page.pageKey).toBe("home");
    expect(response.body.page.content.blocks[0].data.headline).toBe("Main Draft Home");
    expect(response.body.page.editorResolution).toMatchObject({
      preferredEditor: "BLOCK",
      editorRoute: "/admin/pages/home",
      contentMode: "MODERN_ONLY",
    });
  });

  it("PUT /admin/pages/:pageKey/draft saves a valid draft", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .put("/admin/pages/about/draft")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        title: "About Updated",
        slug: "/about",
        seoTitle: "About Updated",
        seoDescription: "Updated about page",
        content: {
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              data: { headline: "Updated About", subheadline: "New copy" },
            },
            {
              id: "stats-1",
              type: "stats",
              data: {
                heading: "Proof",
                items: [{ label: "Clients", value: "25+" }],
              },
            },
          ],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.page.title).toBe("About Updated");
    expect(response.body.page.lineage.status).toBe("MODIFIED");
    expect(response.body.page.content.blocks[0].data.headline).toBe("Updated About");
    expect(state.revisions.some((revision) => revision.pageId === "page-main-about" && revision.revisionNumber === 2)).toBe(true);
    expect(state.pages.find((page) => page.id === "page-main-about")?.lineageStatus).toBe(
      "MODIFIED"
    );

    const listResponse = await request(app)
      .get("/admin/pages")
      .set("Cookie", [`cms_token=${token}`]);
    const aboutSummary = listResponse.body.pages.find(
      (page: { pageKey: string }) => page.pageKey === "about"
    );

    expect(listResponse.status).toBe(200);
    expect(aboutSummary.lineage.status).toBe("MODIFIED");
  });

  it("keeps unresolved legacy page lineage untracked", async () => {
    addPage({
      id: "page-main-legacy",
      siteId: "site-main",
      pageKey: "custom__legacy",
      pageTemplateKey: "missing-template",
      slug: "/legacy",
      title: "Legacy",
      allowedBlockTypes: ["hero", "cta"],
      draftContent: {
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            data: { headline: "Legacy page" },
          },
        ],
      },
    });

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages/custom__legacy/draft")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.page.lineage).toMatchObject({
      status: "UNTRACKED",
      isTracked: false,
    });
    expect(state.pages.find((page) => page.id === "page-main-legacy")?.lineageStatus).toBe(
      "UNTRACKED"
    );
  });

  it("PUT /admin/pages/:pageKey/draft rejects invalid block types", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .put("/admin/pages/about/draft")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        title: "About Updated",
        slug: "/about",
        content: {
          blocks: [
            {
              id: "faq-1",
              type: "faq",
              data: {
                heading: "FAQ",
                items: [{ question: "Q1", answer: "A1" }],
              },
            },
          ],
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Block type "faq" is not allowed');
  });

  it("PUT /admin/pages/:pageKey/draft accepts modified tracked pages whose current draft schema is richer than the stored allowed types", async () => {
    const page = state.pages.find((entry) => entry.id === "page-main-about");
    const draftRevision = state.revisions.find(
      (entry) => entry.id === "page-main-about-draft"
    );

    if (!page || !draftRevision) {
      throw new Error("Missing about page setup");
    }

    page.allowedBlockTypes = ["hero"];
    page.lineageStatus = "MODIFIED";
    draftRevision.content = {
      blocks: [
        {
          id: "faq-1",
          type: "faq",
          data: {
            heading: "FAQ",
            items: [{ question: "Q1", answer: "A1" }],
          },
        },
      ],
    };

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .put("/admin/pages/about/draft")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        title: "About Updated",
        slug: "/about",
        content: {
          blocks: [
            {
              id: "faq-1",
              type: "faq",
              data: {
                heading: "FAQ",
                items: [{ question: "Q1", answer: "A1" }],
              },
            },
          ],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.page.content.blocks[0].type).toBe("faq");
  });

  it("POST /admin/pages/:pageKey/publish publishes a valid draft", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/pages/about/publish")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.page.status).toBe("PUBLISHED");
    expect(response.body.page.publishedRevisionNumber).toBe(2);
  });

  it("GET /admin/pages marks home as published when all legacy home sections are published", async () => {
    const homeSections = [
      "hero",
      "services",
      "featuredWork",
      "faq",
      "cta",
      "testimonials",
      "awards",
    ];

    state.cmsSections.push(
      ...homeSections.map((section, index) => ({
        siteId: "site-main",
        page: "home",
        section,
        status: "PUBLISHED" as const,
        publishedAt: new Date(`2026-04-05T00:${10 + index}:00.000Z`),
      }))
    );

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    const homePage = response.body.pages.find((page: any) => page.pageKey === "home");
    expect(homePage.status).toBe("PUBLISHED");
    expect(homePage.publishedAt).toBeTruthy();
    expect(homePage.modernStatus).toBe("PUBLISHED");
    expect(homePage.legacyStatus).toBe("PUBLISHED");
    expect(homePage.editorResolution).toMatchObject({
      preferredEditor: "BLOCK",
      editorRoute: "/admin/pages/home",
      legacyEditorRoute: "/admin/legacy/home",
      contentMode: "MIXED",
      migrationAvailable: true,
    });
  });

  it("GET /public/pages/:pageKey returns published content only", async () => {
    const app = await createTestApp();

    const response = await request(app).get("/public/pages/home");

    expect(response.status).toBe(200);
    expect(response.body.page.content.blocks[0].data.headline).toBe("Main Published Home");
  });

  it("GET /public/pages/by-slug returns a published custom page", async () => {
    addPage({
      id: "page-main-team",
      siteId: "site-main",
      pageKey: "custom__team",
      slug: "/team",
      title: "Team",
      draftContent: contentWithHeadline("Draft Team"),
      publishedContent: contentWithHeadline("Published Team"),
    });

    const app = await createTestApp();

    const response = await request(app).get("/public/pages/by-slug?slug=/team");

    expect(response.status).toBe(200);
    expect(response.body.page.pageKey).toBe("custom__team");
    expect(response.body.page.content.blocks[0].data.headline).toBe("Published Team");
  });

  it("GET /public/pages/:pageKey does not expose draft-only changes before publish", async () => {
    const app = await createTestApp();

    const response = await request(app).get("/public/pages/home");

    expect(response.status).toBe(200);
    expect(response.body.page.content.blocks[0].data.headline).not.toBe("Main Draft Home");
  });

  it("POST /admin/pages/:pageKey/restore/:revisionId creates a new draft from history", async () => {
    const page = state.pages.find((entry) => entry.id === "page-main-home");
    const earlierRevision = state.revisions.find((entry) => entry.id === "page-main-home-draft");
    if (!page || !earlierRevision) {
      throw new Error("Missing test page setup");
    }

    page.currentDraftRevisionId = "page-main-home-published";

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post(`/admin/pages/home/restore/${earlierRevision.id}`)
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.page.draftRevisionNumber).toBe(3);
    expect(response.body.page.content.blocks[0].data.headline).toBe("Main Draft Home");
  });

  it("cross-site access is isolated correctly", async () => {
    const app = await createTestApp();

    const defaultResponse = await request(app).get("/public/pages/home");
    const branchResponse = await request(app).get("/public/pages/home?site=branch");

    expect(defaultResponse.status).toBe(200);
    expect(branchResponse.status).toBe(200);
    expect(defaultResponse.body.page.content.blocks[0].data.headline).toBe("Main Published Home");
    expect(branchResponse.body.page.content.blocks[0].data.headline).toBe("Branch Published Home");
  });

  it("template page restrictions are enforced", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-clinic",
    });

    const response = await request(app)
      .get("/admin/pages/work/draft")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Page not found.");
  });

  it("unknown pageKey returns 404", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/pages/missing/draft")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(404);
  });

  it("invalid content shape returns 400", async () => {
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .put("/admin/pages/home/draft")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        title: "Broken Home",
        slug: "/",
        content: {
          blocks: {
            wrong: true,
          },
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });
});
