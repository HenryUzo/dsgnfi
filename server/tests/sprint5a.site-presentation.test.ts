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
let assetCounter = 1;

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  siteSettings: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  page: { findMany: vi.fn() },
  asset: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../src/db/prisma", () => ({ prisma: mockPrisma }));

function signAdminToken(siteId = "site-main") {
  return jwt.sign(
    {
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function setupMocks() {
  mockPrisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
    Promise.all(operations)
  );

  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.auditLog.create.mockImplementation(async (args: any) => {
    const record = {
      id: `audit-${(state.auditLogs?.length ?? 0) + 1}`,
      createdAt: new Date().toISOString(),
      ...args.data,
    };
    state.auditLogs.push(record);
    return clone(record);
  });

  mockPrisma.membership.findMany.mockResolvedValue([
    {
      tenantId: "tenant-1",
      role: "OWNER",
      tenant: {
        id: "tenant-1",
        slug: "dsgnfi",
        name: "Dsgnfi",
      },
    },
  ]);
  mockPrisma.membership.findFirst.mockResolvedValue({
    tenantId: "tenant-1",
    role: "OWNER",
  });

  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    let sites = state.sites.filter((site: any) => site.status !== "ARCHIVED");
    if (where.id) {
      sites = sites.filter((site: any) => site.id === where.id);
    }
    if (where.tenantId) {
      sites = sites.filter((site: any) => site.tenantId === where.tenantId);
    }
    if (where.slug) {
      sites = sites.filter((site: any) => site.slug === where.slug);
    }
    if (where.isDefault === true) {
      sites = sites.filter((site: any) => site.isDefault);
    }
    if (where.tenant?.slug) {
      sites = sites.filter((site: any) => site.tenant.slug === where.tenant.slug);
    }
    return clone(sites[0] ?? null);
  });

  mockPrisma.site.findUnique.mockImplementation(async (args: any) => {
    const site = state.sites.find((entry: any) => entry.id === args?.where?.id);
    if (!site) return null;

    const settings = state.siteSettings.find((entry: any) => entry.siteId === site.id) ?? null;
    const pages = state.pages.filter((entry: any) => entry.siteId === site.id);

    return clone({
      ...site,
      settings: args?.include?.settings ? settings : undefined,
      pages: args?.include?.pages ? pages : undefined,
      template: args?.include?.template ? site.template ?? null : undefined,
      templateVersion: args?.include?.templateVersion ? site.templateVersion ?? null : undefined,
    });
  });

  mockPrisma.site.update.mockImplementation(async (args: any) => {
    const site = state.sites.find((entry: any) => entry.id === args.where.id);
    Object.assign(site, args.data);
    return clone(site);
  });

  mockPrisma.siteSettings.findUnique.mockImplementation(async (args: any) =>
    clone(state.siteSettings.find((entry: any) => entry.siteId === args.where.siteId) ?? null)
  );
  mockPrisma.siteSettings.create.mockImplementation(async (args: any) => {
    const record = {
      id: `settings-${args.data.siteId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...args.data,
    };
    state.siteSettings.push(record);
    return clone(record);
  });
  mockPrisma.siteSettings.update.mockImplementation(async (args: any) => {
    const record = state.siteSettings.find((entry: any) => entry.siteId === args.where.siteId);
    Object.assign(record, args.data, { updatedAt: new Date().toISOString() });
    return clone(record);
  });
  mockPrisma.siteSettings.updateMany.mockImplementation(async (args: any) => {
    const records = state.siteSettings.filter((entry: any) => {
      if (entry.siteId !== args.where.siteId) return false;
      return (
        args.where.OR?.some((condition: any) => condition.logoUrl === entry.logoUrl || condition.faviconUrl === entry.faviconUrl) ??
        false
      );
    });
    for (const record of records) {
      Object.assign(record, args.data, { updatedAt: new Date().toISOString() });
    }
    return { count: records.length };
  });

  mockPrisma.page.findMany.mockImplementation(async (args: any) => {
    const pages = state.pages.filter((page: any) => {
      if (args?.where?.siteId && page.siteId !== args.where.siteId) return false;
      if (args?.where?.pageKey?.in && !args.where.pageKey.in.includes(page.pageKey)) return false;
      return true;
    });
    return clone(pages);
  });

  mockPrisma.asset.findMany.mockImplementation(async (args: any) =>
    clone(
      state.assets
        .filter((asset: any) => asset.siteId === args.where.siteId)
        .sort((a: any, b: any) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    )
  );
  mockPrisma.asset.create.mockImplementation(async (args: any) => {
    const asset = {
      id: `asset-${assetCounter++}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...args.data,
    };
    state.assets.push(asset);
    return clone(asset);
  });
  mockPrisma.asset.findFirst.mockImplementation(async (args: any) =>
    clone(
      state.assets.find(
        (asset: any) =>
          (!args.where.id || asset.id === args.where.id) &&
          (!args.where.siteId || asset.siteId === args.where.siteId)
      ) ?? null
    )
  );
  mockPrisma.asset.update.mockImplementation(async (args: any) => {
    const asset = state.assets.find((entry: any) => entry.id === args.where.id);
    Object.assign(asset, args.data, { updatedAt: new Date().toISOString() });
    return clone(asset);
  });
  mockPrisma.asset.delete.mockImplementation(async (args: any) => {
    state.assets = state.assets.filter((entry: any) => entry.id !== args.where.id);
    return null;
  });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

describe("Sprint 5A site presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assetCounter = 1;
    state = {
      sites: [
        {
          id: "site-main",
          tenantId: "tenant-1",
          slug: "main",
          name: "Main Site",
          status: "ACTIVE",
          isDefault: true,
          tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
        },
        {
          id: "site-branch",
          tenantId: "tenant-1",
          slug: "branch",
          name: "Branch Site",
          status: "ACTIVE",
          isDefault: false,
          tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
        },
      ],
      siteSettings: [
        {
          id: "settings-main",
          siteId: "site-main",
          logoUrl: "http://localhost:4000/uploads/main-logo.png",
          faviconUrl: null,
          tagline: "Main site tagline",
          contactEmail: "hello@main.test",
          contactPhone: null,
          address: "Main address",
          socialLinks: { linkedin: "https://linkedin.com/company/main" },
          seoTitle: "Main SEO",
          seoDescription: "Main description",
          theme: { primaryColor: "#112233", accentColor: "#445566" },
          primaryNavigation: [
            { id: "main-work", label: "Work", pageKey: "work", href: null, visible: true, order: 0 },
          ],
          footerNavigation: [
            { id: "main-contact", label: "Contact", pageKey: "contact", href: null, visible: true, order: 0 },
          ],
          locale: "en",
          timezone: "Africa/Lagos",
        },
        {
          id: "settings-branch",
          siteId: "site-branch",
          logoUrl: null,
          faviconUrl: null,
          tagline: "Branch tagline",
          contactEmail: "hello@branch.test",
          contactPhone: null,
          address: "Branch address",
          socialLinks: {},
          seoTitle: "Branch SEO",
          seoDescription: "Branch description",
          theme: { primaryColor: "#AA0000", accentColor: "#00AA00" },
          primaryNavigation: [],
          footerNavigation: [],
          locale: "en",
          timezone: "Africa/Lagos",
        },
      ],
      pages: [
        { siteId: "site-main", pageKey: "work", slug: "work", currentPublishedRevisionId: "rev-work-main" },
        { siteId: "site-main", pageKey: "contact", slug: "contact", currentPublishedRevisionId: "rev-contact-main" },
        { siteId: "site-branch", pageKey: "contact", slug: "contact", currentPublishedRevisionId: "rev-contact-branch" },
      ],
      assets: [
        {
          id: "asset-existing-main",
          siteId: "site-main",
          url: "http://localhost:4000/uploads/existing-main.png",
          filename: "existing-main.png",
          mimeType: "image/png",
          size: 1024,
          altText: "Existing main",
          createdAt: new Date("2026-04-07T00:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-07T00:00:00.000Z").toISOString(),
        },
        {
          id: "asset-existing-branch",
          siteId: "site-branch",
          url: "http://localhost:4000/uploads/existing-branch.png",
          filename: "existing-branch.png",
          mimeType: "image/png",
          size: 2048,
          altText: "Existing branch",
          createdAt: new Date("2026-04-06T00:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-06T00:00:00.000Z").toISOString(),
        },
      ],
      auditLogs: [],
    };

    setupMocks();
  });

  it("uploads and lists assets scoped to the current site", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const uploadResponse = await request(app)
      .post("/admin/assets")
      .set("Cookie", cookie)
      .attach("file", Buffer.from("fake-image"), {
        filename: "logo.png",
        contentType: "image/png",
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.asset.filename).toBe("logo.png");
    expect(uploadResponse.body.asset.url).toContain("/uploads/");

    const listResponse = await request(app)
      .get("/admin/assets")
      .set("Cookie", cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.assets).toHaveLength(2);
    expect(listResponse.body.assets.every((asset: any) => asset.url.includes("branch"))).toBe(false);
    expect(listResponse.body.assets.every((asset: any) => !asset.url.includes("existing-branch"))).toBe(true);
  });

  it("updates and deletes asset metadata for the current site", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const patchResponse = await request(app)
      .patch("/admin/assets/asset-existing-main")
      .set("Cookie", cookie)
      .send({ filename: "brand-kit.png", altText: "Brand kit" });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.asset.filename).toBe("brand-kit.png");
    expect(patchResponse.body.asset.altText).toBe("Brand kit");

    const deleteResponse = await request(app)
      .delete("/admin/assets/asset-existing-main")
      .set("Cookie", cookie);

    expect(deleteResponse.status).toBe(204);
    expect(state.assets.some((asset: any) => asset.id === "asset-existing-main")).toBe(false);
  });

  it("fetches and updates current site settings including theme", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const getResponse = await request(app)
      .get("/admin/site-settings")
      .set("Cookie", cookie);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.site.settings.siteName).toBe("Main Site");
    expect(getResponse.body.site.theme.primaryColor).toBe("#112233");

    const patchResponse = await request(app)
      .patch("/admin/site-settings")
      .set("Cookie", cookie)
      .send({
        siteName: "Main Site Updated",
        logoUrl: "http://localhost:4000/uploads/new-logo.png",
        faviconUrl: null,
        tagline: "Updated tagline",
        contactEmail: "team@main.test",
        contactPhone: "+234 555 000",
        address: "Updated address",
        socialLinks: { instagram: "https://instagram.com/main" },
        seoTitle: "Updated SEO",
        seoDescription: "Updated description",
        locale: "en",
        timezone: "Africa/Lagos",
        theme: {
          primaryColor: "#123456",
          accentColor: "#654321",
          backgroundColor: "#000000",
          textColor: "#ffffff",
          buttonRadius: 18,
        },
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.site.settings.siteName).toBe("Main Site Updated");
    expect(patchResponse.body.site.theme.buttonRadius).toBe(18);
    expect(
      state.auditLogs.some((entry: any) => entry.action === "site_settings.updated")
    ).toBe(true);
    expect(
      state.auditLogs.some((entry: any) => entry.action === "site_theme.updated")
    ).toBe(true);
  });

  it("updates navigation and validates page references", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const patchResponse = await request(app)
      .patch("/admin/site-settings/navigation")
      .set("Cookie", cookie)
      .send({
        primaryNavigation: [
          {
            id: "nav-1",
            label: "Work",
            pageKey: "work",
            href: null,
            visible: true,
            order: 0,
          },
          {
            id: "nav-2",
            label: "Studio",
            pageKey: null,
            href: "/studio",
            visible: true,
            order: 1,
          },
        ],
        footerNavigation: [
          {
            id: "nav-3",
            label: "Contact",
            pageKey: "contact",
            href: null,
            visible: true,
            order: 0,
          },
        ],
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.navigation.primary[0].pageKey).toBe("work");
    expect(patchResponse.body.navigation.primary[0].href).toBeNull();

    const invalidResponse = await request(app)
      .patch("/admin/site-settings/navigation")
      .set("Cookie", cookie)
      .send({
        primaryNavigation: [
          {
            id: "nav-invalid",
            label: "Unknown",
            pageKey: "missing-page",
            href: null,
            visible: true,
            order: 0,
          },
        ],
        footerNavigation: [],
      });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error.message).toContain("unknown page");
    expect(
      state.auditLogs.some((entry: any) => entry.action === "site_navigation.updated")
    ).toBe(true);

    const publicNavResponse = await request(app).get("/public/site/navigation");
    expect(publicNavResponse.status).toBe(200);
    expect(publicNavResponse.body.navigation.primary[0].href).toBe("/work");
  });

  it("keeps internal navigation items visible even when the referenced page is not published yet", async () => {
    state.siteSettings[0].primaryNavigation = [
      { id: "nav-home", label: "Home", pageKey: "home", href: null, visible: true, order: 0 },
      { id: "nav-about", label: "About", pageKey: "about", href: null, visible: true, order: 1 },
    ];
    state.pages.push(
      { siteId: "site-main", pageKey: "home", slug: "", currentPublishedRevisionId: null },
      { siteId: "site-main", pageKey: "about", slug: "about", currentPublishedRevisionId: null }
    );

    const app = await createTestApp();
    const response = await request(app).get("/public/site/navigation");

    expect(response.status).toBe(200);
    expect(response.body.navigation.primary).toEqual([
      expect.objectContaining({ label: "Home", href: "/" }),
      expect.objectContaining({ label: "About", href: "/about" }),
    ]);
  });

  it("serves public site presentation per resolved site without leakage", async () => {
    const app = await createTestApp();

    const mainResponse = await request(app).get("/public/site");
    expect(mainResponse.status).toBe(200);
    expect(mainResponse.body.site.slug).toBe("main");
    expect(mainResponse.body.settings.siteName).toBe("Main Site");
    expect(mainResponse.body.navigation.primary[0].href).toBe("/work");

    const branchResponse = await request(app).get("/public/site?site=branch");
    expect(branchResponse.status).toBe(200);
    expect(branchResponse.body.site.slug).toBe("branch");
    expect(branchResponse.body.settings.siteName).toBe("Branch Site");
    expect(branchResponse.body.settings.contactEmail).toBe("hello@branch.test");

    const navResponse = await request(app).get("/public/site/navigation?site=branch");
    expect(navResponse.status).toBe(200);
    expect(navResponse.body.navigation.primary).toEqual([]);
  });

  it("returns 404 instead of a generic 500 when no public site can be resolved", async () => {
    state.sites = [];
    state.siteSettings = [];
    state.pages = [];

    const app = await createTestApp();
    const response = await request(app)
      .get("/public/site")
      .set("Host", "missing.example.com");

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Site not found.");
  });
});
