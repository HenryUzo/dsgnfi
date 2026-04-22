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

let state: any;
let revisionCounter = 10;

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  page: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  pageRevision: { findFirst: vi.fn(), create: vi.fn() },
  cmsSection: { findUnique: vi.fn() },
  workPageMeta: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  workTag: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
  workProject: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  workProjectTag: { count: vi.fn() },
};

vi.mock("../src/db/prisma", () => ({ prisma: mockPrisma }));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function signAdminToken(siteId: string) {
  return jwt.sign(
    { id: "admin-1", email: "admin@dsgnfi.com", tenantId: "tenant-1", siteId },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

function processContent(title: string) {
  return {
    blocks: [
      {
        id: `${title}-hero`,
        type: "processHeroAtticSalt",
        data: { title, collageImageUrl: "", collageAlt: "Process collage" },
      },
      {
        id: `${title}-cta`,
        type: "processCtaOutline",
        data: { title: "Ready to start\na project?", linkLabel: "LET'S CHAT", href: "/contact" },
      },
    ],
  };
}

function pageContent(title: string) {
  return {
    blocks: [{ id: `${title}-1`, type: "richText", data: { title, body: `${title} body` } }],
  };
}

function uniqueError(code: string) {
  const err = new Error(code) as Error & { code?: string; name: string };
  err.name = "PrismaClientKnownRequestError";
  err.code = code;
  return err;
}

function pageWithRevisions(page: any) {
  return {
    ...clone(page),
    currentDraftRevision: page.currentDraftRevisionId
      ? clone(state.revisions.find((r: any) => r.id === page.currentDraftRevisionId) ?? null)
      : null,
    currentPublishedRevision: page.currentPublishedRevisionId
      ? clone(state.revisions.find((r: any) => r.id === page.currentPublishedRevisionId) ?? null)
      : null,
  };
}

function projectTags(projectId: string, includeTag: boolean) {
  return state.workProjectTags
    .filter((entry: any) => entry.projectId === projectId)
    .map((entry: any) =>
      includeTag ? { ...entry, tag: clone(state.workTags.find((tag: any) => tag.id === entry.tagId)) } : clone(entry)
    );
}

function projectDto(project: any, includeTag: boolean) {
  return { ...clone(project), tags: projectTags(project.id, includeTag) };
}

function installMocks() {
  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.site.findMany.mockResolvedValue([]);
  mockPrisma.membership.findMany.mockResolvedValue([
    { tenantId: "tenant-1", role: "OWNER", tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi", sites: [] } },
  ]);
  mockPrisma.membership.findFirst.mockImplementation(async (args: any) =>
    args?.where?.userId === "admin-1" && args?.where?.tenantId === "tenant-1"
      ? { tenantId: "tenant-1", role: "OWNER" }
      : null
  );
  mockPrisma.site.findUnique.mockImplementation(async (args: any) =>
    clone(state.sites.find((site: any) => site.id === args?.where?.id) ?? null)
  );
  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    let sites = state.sites.filter((site: any) => site.status !== "ARCHIVED");
    if (where.tenantId) sites = sites.filter((site: any) => site.tenantId === where.tenantId);
    if (where.slug) sites = sites.filter((site: any) => site.slug === where.slug);
    if (where.isDefault === true) sites = sites.filter((site: any) => site.isDefault);
    if (where.tenant?.slug) sites = sites.filter((site: any) => site.tenant.slug === where.tenant.slug);
    return clone(sites[0] ?? null);
  });

  mockPrisma.page.findUnique.mockImplementation(async (args: any) => {
    const key = args?.where?.siteId_pageKey;
    const page = state.pages.find((entry: any) => entry.siteId === key.siteId && entry.pageKey === key.pageKey);
    if (!page) return null;
    return args?.include ? pageWithRevisions(page) : clone(page);
  });
  mockPrisma.page.create.mockImplementation(async (args: any) => {
    const page = { id: `page-created-${state.pages.length + 1}`, currentDraftRevisionId: null, currentPublishedRevisionId: null, createdAt: new Date(), updatedAt: new Date(), ...args.data };
    state.pages.push(page);
    return clone(page);
  });
  mockPrisma.page.update.mockImplementation(async (args: any) => {
    const page = state.pages.find((entry: any) => entry.id === args.where.id);
    Object.assign(page, args.data, { updatedAt: new Date() });
    return args?.include ? pageWithRevisions(page) : clone(page);
  });
  mockPrisma.pageRevision.findFirst.mockImplementation(async (args: any) => {
    let revisions = state.revisions.filter((rev: any) => !args?.where?.pageId || rev.pageId === args.where.pageId);
    if (args?.orderBy?.revisionNumber === "desc") revisions = revisions.sort((a: any, b: any) => b.revisionNumber - a.revisionNumber);
    return args?.select?.revisionNumber ? (revisions[0] ? { revisionNumber: revisions[0].revisionNumber } : null) : clone(revisions[0] ?? null);
  });
  mockPrisma.pageRevision.create.mockImplementation(async (args: any) => {
    const revision = { id: `revision-${revisionCounter++}`, createdAt: new Date(), publishedAt: args.data.publishedAt ?? null, ...args.data };
    state.revisions.push(revision);
    return clone(revision);
  });
  mockPrisma.cmsSection.findUnique.mockImplementation(async (args: any) =>
    clone(
      state.cmsSections.find(
        (entry: any) =>
          entry.siteId === args?.where?.siteId_page_section?.siteId &&
          entry.page === args.where.siteId_page_section.page &&
          entry.section === args.where.siteId_page_section.section
      ) ?? null
    )
  );

  mockPrisma.workPageMeta.findUnique.mockImplementation(async (args: any) =>
    clone(state.workMeta.find((entry: any) => entry.siteId === args?.where?.siteId_key?.siteId && entry.key === args.where.siteId_key.key) ?? null)
  );
  mockPrisma.workPageMeta.upsert.mockImplementation(async (args: any) => {
    let record = state.workMeta.find((entry: any) => entry.siteId === args.where.siteId_key.siteId && entry.key === args.where.siteId_key.key);
    if (!record) {
      record = { updatedAt: new Date(), publishedAt: null, ...args.create };
      state.workMeta.push(record);
    } else {
      Object.assign(record, args.update, { updatedAt: new Date() });
    }
    return clone(record);
  });
  mockPrisma.workPageMeta.update.mockImplementation(async (args: any) => {
    const record = state.workMeta.find((entry: any) => entry.siteId === args.where.siteId_key.siteId && entry.key === args.where.siteId_key.key);
    Object.assign(record, args.data, { updatedAt: new Date() });
    return clone(record);
  });

  mockPrisma.workTag.findMany.mockImplementation(async (args: any) => {
    let tags = state.workTags.filter((tag: any) => tag.siteId === args?.where?.siteId);
    if (args?.where?.projects?.some?.project?.status === "PUBLISHED") {
      tags = tags.filter((tag: any) =>
        state.workProjectTags.some(
          (link: any) =>
            link.tagId === tag.id &&
            state.workProjects.some((project: any) => project.id === link.projectId && project.siteId === tag.siteId && project.status === "PUBLISHED")
        )
      );
    }
    return clone(tags);
  });
  mockPrisma.workTag.findFirst.mockImplementation(async (args: any) => {
    const tag = state.workTags.find((entry: any) => entry.id === args?.where?.id && entry.siteId === args?.where?.siteId);
    return tag ? clone(args?.select ? { id: tag.id } : tag) : null;
  });
  mockPrisma.workTag.count.mockImplementation(async (args: any) =>
    state.workTags.filter((tag: any) => tag.siteId === args.where.siteId && args.where.id.in.includes(tag.id)).length
  );
  mockPrisma.workTag.create.mockImplementation(async (args: any) => {
    if (state.workTags.some((tag: any) => tag.siteId === args.data.siteId && tag.slug === args.data.slug)) throw uniqueError("P2002");
    const tag = { id: "33333333-3333-4333-8333-333333333333", createdAt: new Date(), updatedAt: new Date(), ...args.data };
    state.workTags.push(tag);
    return clone(tag);
  });
  mockPrisma.workTag.update.mockImplementation(async (args: any) => {
    const tag = state.workTags.find((entry: any) => entry.id === args.where.id);
    Object.assign(tag, args.data, { updatedAt: new Date() });
    return clone(tag);
  });
  mockPrisma.workTag.delete.mockImplementation(async (args: any) => {
    state.workTags = state.workTags.filter((entry: any) => entry.id !== args.where.id);
    return null;
  });
  mockPrisma.workProjectTag.count.mockImplementation(async (args: any) =>
    state.workProjectTags.filter((entry: any) => {
      if (entry.tagId !== args.where.tagId) return false;
      const project = state.workProjects.find((item: any) => item.id === entry.projectId);
      return project?.siteId === args.where.project.siteId;
    }).length
  );

  mockPrisma.workProject.findMany.mockImplementation(async (args: any) => {
    let projects = state.workProjects.filter((project: any) => {
      const where = args?.where ?? {};
      if (where.siteId && project.siteId !== where.siteId) return false;
      if (where.status && project.status !== where.status) return false;
      if (where.tags?.some?.tag?.slug) {
        return state.workProjectTags.some((link: any) => {
          const tag = state.workTags.find((item: any) => item.id === link.tagId);
          return link.projectId === project.id && tag?.slug === where.tags.some.tag.slug && tag.siteId === where.tags.some.tag.siteId;
        });
      }
      return true;
    });
    return projects.map((project: any) => projectDto(project, Boolean(args?.include?.tags?.include?.tag)));
  });
  mockPrisma.workProject.findFirst.mockImplementation(async (args: any) => {
    const project = state.workProjects.find((entry: any) => {
      const where = args?.where ?? {};
      if (where.id && entry.id !== where.id) return false;
      if (where.siteId && entry.siteId !== where.siteId) return false;
      if (where.status && entry.status !== where.status) return false;
      if (where.slugPublished && entry.slugPublished !== where.slugPublished) return false;
      return true;
    });
    if (!project) return null;
    return args?.select ? clone({ id: project.id }) : projectDto(project, Boolean(args?.include?.tags?.include?.tag));
  });
  mockPrisma.workProject.create.mockImplementation(async (args: any) => {
    if (state.workProjects.some((entry: any) => entry.siteId === args.data.siteId && entry.slugDraft === args.data.slugDraft)) throw uniqueError("P2002");
    const project = { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", titlePublished: null, slugPublished: null, excerptPublished: null, coverImagePublished: null, publishedContent: {}, status: "DRAFT", publishedAt: null, createdAt: new Date(), updatedAt: new Date(), ...args.data };
    state.workProjects.push(project);
    state.workProjectTags.push(...(args.data.tags?.create ?? []).map((entry: any) => ({ projectId: project.id, tagId: entry.tagId })));
    return projectDto(project, Boolean(args?.include?.tags?.include?.tag));
  });
  mockPrisma.workProject.update.mockImplementation(async (args: any) => {
    const project = state.workProjects.find((entry: any) => entry.id === args.where.id);
    if (!project) throw uniqueError("P2025");
    Object.assign(project, args.data, { updatedAt: new Date() });
    if (args.data.tags?.deleteMany) state.workProjectTags = state.workProjectTags.filter((entry: any) => entry.projectId !== project.id);
    if (args.data.tags?.create) state.workProjectTags.push(...args.data.tags.create.map((entry: any) => ({ projectId: project.id, tagId: entry.tagId })));
    return projectDto(project, Boolean(args?.include?.tags?.include?.tag));
  });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  revisionCounter = 10;
  state = {
    sites: [
      { id: "site-main", tenantId: "tenant-1", slug: "main", name: "Main Site", status: "ACTIVE", isDefault: true, createdAt: new Date(), updatedAt: new Date(), tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" } },
      { id: "site-branch", tenantId: "tenant-1", slug: "branch", name: "Branch Site", status: "ACTIVE", isDefault: false, createdAt: new Date(), updatedAt: new Date(), tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" } },
      { id: "site-foreign", tenantId: "tenant-2", slug: "foreign", name: "Foreign Site", status: "ACTIVE", isDefault: true, createdAt: new Date(), updatedAt: new Date(), tenant: { id: "tenant-2", slug: "other", name: "Other" } },
    ],
    pages: [
      { id: "page-main-process", siteId: "site-main", pageKey: "process", slug: "/process", title: "Process", status: "PUBLISHED", seoTitle: "Process", seoDescription: "Process description", currentDraftRevisionId: "rev-main-draft", currentPublishedRevisionId: "rev-main-published", createdAt: new Date(), updatedAt: new Date() },
    ],
    revisions: [
      { id: "rev-main-draft", pageId: "page-main-process", revisionNumber: 1, state: "DRAFT", content: processContent("Main Draft Process"), schemaVersion: 1, checksum: null, createdBy: "admin-1", publishedBy: null, createdAt: new Date(), publishedAt: null },
      { id: "rev-main-published", pageId: "page-main-process", revisionNumber: 2, state: "PUBLISHED", content: processContent("Main Published Process"), schemaVersion: 1, checksum: null, createdBy: "admin-1", publishedBy: "admin-1", createdAt: new Date(), publishedAt: new Date() },
    ],
    cmsSections: [
      { id: "section-main-home", siteId: "site-main", page: "home", section: "hero", status: "PUBLISHED", draftData: { headline: "Main Home Hero Draft" }, publishedData: { headline: "Main Home Hero Published" }, updatedAt: new Date(), publishedAt: new Date() },
      { id: "section-branch-home", siteId: "site-branch", page: "home", section: "hero", status: "PUBLISHED", draftData: { headline: "Branch Home Hero Draft" }, publishedData: { headline: "Branch Home Hero Published" }, updatedAt: new Date(), publishedAt: new Date() },
      { id: "section-branch-process", siteId: "site-branch", page: "process", section: "content", status: "PUBLISHED", draftData: processContent("Branch Legacy Process Draft"), publishedData: processContent("Branch Legacy Process Published"), updatedAt: new Date(), publishedAt: new Date() },
    ],
    workMeta: [
      { siteId: "site-main", key: "work", titleDraft: "Main Work Draft", subtitleDraft: "Main draft subtitle", titlePublished: "Main Work", subtitlePublished: "Main published subtitle", status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() },
      { siteId: "site-branch", key: "work", titleDraft: "Branch Work Draft", subtitleDraft: "Branch draft subtitle", titlePublished: "Branch Work", subtitlePublished: "Branch published subtitle", status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() },
    ],
    workTags: [
      { id: "11111111-1111-4111-8111-111111111111", siteId: "site-main", name: "Brand Strategy", slug: "brand-strategy", createdAt: new Date(), updatedAt: new Date() },
      { id: "22222222-2222-4222-8222-222222222222", siteId: "site-branch", name: "Operations", slug: "operations", createdAt: new Date(), updatedAt: new Date() },
    ],
    workProjects: [
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", siteId: "site-main", templateId: "classic-case-study", titleDraft: "Main Draft Project", slugDraft: "main-draft-project", excerptDraft: "Main draft excerpt", coverImageDraft: "/draft.jpg", draftContent: pageContent("Main Draft Project"), titlePublished: "Main Published Project", slugPublished: "main-published-project", excerptPublished: "Main published excerpt", coverImagePublished: "/published.jpg", publishedContent: pageContent("Main Published Project"), status: "PUBLISHED", publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", siteId: "site-main", templateId: "classic-case-study", titleDraft: "Main Only Draft", slugDraft: "main-only-draft", excerptDraft: "Draft only excerpt", coverImageDraft: "/draft-only.jpg", draftContent: pageContent("Main Only Draft"), titlePublished: null, slugPublished: null, excerptPublished: null, coverImagePublished: null, publishedContent: {}, status: "DRAFT", publishedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", siteId: "site-branch", templateId: "classic-case-study", titleDraft: "Branch Published Project", slugDraft: "branch-published-project", excerptDraft: "Branch published excerpt", coverImageDraft: "/branch.jpg", draftContent: pageContent("Branch Published Project"), titlePublished: "Branch Published Project", slugPublished: "branch-published-project", excerptPublished: "Branch published excerpt", coverImagePublished: "/branch.jpg", publishedContent: pageContent("Branch Published Project"), status: "PUBLISHED", publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ],
    workProjectTags: [
      { projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", tagId: "11111111-1111-4111-8111-111111111111" },
      { projectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", tagId: "11111111-1111-4111-8111-111111111111" },
      { projectId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", tagId: "22222222-2222-4222-8222-222222222222" },
    ],
  };
  installMocks();
});

describe("Sprint 4 legacy compatibility routes", () => {
  it("reads and writes process content through the page engine and keeps public published-only", async () => {
    const app = await createTestApp();
    const token = signAdminToken("site-main");

    const draftResponse = await request(app).get("/admin/process/content").set("Cookie", [`cms_token=${token}`]);
    expect(draftResponse.status).toBe(200);
    expect(draftResponse.body.data.blocks[0].data.title).toBe("Main Draft Process");

    await request(app)
      .put("/admin/process/content")
      .set("Cookie", [`cms_token=${token}`])
      .send(processContent("Updated Draft Process"))
      .expect(200);

    const stillPublished = await request(app).get("/public/process/content");
    expect(stillPublished.body.data.blocks[0].data.title).toBe("Main Published Process");

    await request(app).post("/admin/process/content/publish").set("Cookie", [`cms_token=${token}`]).expect(200);
    const nowPublished = await request(app).get("/public/process/content");
    expect(nowPublished.body.data.blocks[0].data.title).toBe("Updated Draft Process");
  });

  it("bridges legacy process content when page-engine process content is missing", async () => {
    const app = await createTestApp();
    const token = signAdminToken("site-branch");

    const adminResponse = await request(app).get("/admin/process/content").set("Cookie", [`cms_token=${token}`]);
    expect(adminResponse.body.data.blocks[0].data.title).toBe("Branch Legacy Process Draft");

    const publicResponse = await request(app).get("/public/process/content?site=branch");
    expect(publicResponse.body.data.blocks[0].data.title).toBe("Branch Legacy Process Published");
  });

  it("keeps work admin and public access site-scoped and published-only", async () => {
    const app = await createTestApp();
    const token = signAdminToken("site-main");

    const adminList = await request(app).get("/admin/work/projects").set("Cookie", [`cms_token=${token}`]);
    expect(adminList.status).toBe(200);
    expect(adminList.body.projects).toHaveLength(2);

    await request(app)
      .put("/admin/work/projects/cccccccc-cccc-4ccc-8ccc-cccccccccccc")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        title: "Nope",
        slug: "nope",
        excerpt: "Nope",
        coverImage: "/nope.jpg",
        tagIds: ["11111111-1111-4111-8111-111111111111"],
        draftContent: pageContent("Nope"),
      })
      .expect(404);

    const mainPublic = await request(app).get("/public/work/projects");
    expect(mainPublic.body.projects).toHaveLength(1);
    expect(mainPublic.body.projects[0].slug).toBe("main-published-project");

    const branchPublic = await request(app).get("/public/work/projects?site=branch");
    expect(branchPublic.body.projects).toHaveLength(1);
    expect(branchPublic.body.projects[0].slug).toBe("branch-published-project");

    await request(app).get("/public/work/projects/main-only-draft").expect(404);
  });

  it("prevents work tag leakage across sites", async () => {
    const app = await createTestApp();

    const mainTags = await request(app).get("/public/work/tags");
    expect(mainTags.body.tags).toHaveLength(1);
    expect(mainTags.body.tags[0].slug).toBe("brand-strategy");

    const branchTags = await request(app).get("/public/work/tags?site=branch");
    expect(branchTags.body.tags).toHaveLength(1);
    expect(branchTags.body.tags[0].slug).toBe("operations");
  });

  it("makes public CMS page-engine-preferring for process and site-aware fallback for legacy sections", async () => {
    const app = await createTestApp();

    const processCms = await request(app).get("/public/cms/section?page=process&section=content");
    expect(processCms.body.data.blocks[0].data.title).toBe("Main Published Process");

    const mainHero = await request(app).get("/public/cms/section?page=home&section=hero");
    expect(mainHero.body.data.headline).toBe("Main Home Hero Published");

    const branchHero = await request(app).get("/public/cms/section?page=home&section=hero&site=branch");
    expect(branchHero.body.data.headline).toBe("Branch Home Hero Published");
  });
});
