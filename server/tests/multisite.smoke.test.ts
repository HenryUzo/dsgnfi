import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  cmsSection: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  workPageMeta: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  workTag: { findMany: vi.fn(), count: vi.fn(), upsert: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  workProject: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  workProjectTag: { count: vi.fn(), upsert: vi.fn() },
  adminUser: { findUnique: vi.fn() },
  tenant: { upsert: vi.fn() },
  $queryRawUnsafe: vi.fn(),
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

function signAdminToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.site.findFirst.mockResolvedValue(null);
  mockPrisma.site.findUnique.mockResolvedValue(null);
  mockPrisma.membership.findMany.mockResolvedValue([]);
  mockPrisma.membership.findFirst.mockResolvedValue(null);
  mockPrisma.cmsSection.findUnique.mockResolvedValue(null);
});

describe("Sprint 1 multisite smoke", () => {
  it("does not fall back to the default site for unresolved non-local public hosts", async () => {
    const defaultSite = {
      id: "site-main",
      tenantId: "tenant-default",
      slug: "main",
      status: "ACTIVE",
      isDefault: true,
      tenant: { id: "tenant-default", slug: "dsgnfi", name: "Dsgnfi" },
    };

    mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.slug === "main" && args?.where?.tenant?.slug === "dsgnfi") {
        return defaultSite;
      }
      return null;
    });

    mockPrisma.cmsSection.findUnique.mockResolvedValue({
      page: "home",
      section: "hero",
      status: "PUBLISHED",
      publishedData: { headline: "Default Hero" },
    });

    const app = await createTestApp();
    const response = await request(app)
      .get("/public/cms/section?page=home&section=hero")
      .set("Host", "unknown.local");

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.message).toBe("Site not found.");
    expect(mockPrisma.cmsSection.findUnique).not.toHaveBeenCalled();
  });

  it("isolates public CMS content between site slugs", async () => {
    const siteBySlug: Record<string, any> = {
      "site-a": {
        id: "site-a-id",
        tenantId: "tenant-a",
        slug: "site-a",
        status: "ACTIVE",
        tenant: { id: "tenant-a", slug: "tenant-a", name: "Tenant A" },
      },
      "site-b": {
        id: "site-b-id",
        tenantId: "tenant-b",
        slug: "site-b",
        status: "ACTIVE",
        tenant: { id: "tenant-b", slug: "tenant-b", name: "Tenant B" },
      },
    };

    mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
      const slug = args?.where?.slug;
      return slug ? siteBySlug[slug] ?? null : null;
    });

    mockPrisma.cmsSection.findUnique.mockImplementation(async (args: any) => {
      const siteId = args.where.siteId_page_section.siteId;
      if (siteId === "site-a-id") {
        return { status: "PUBLISHED", publishedData: { headline: "Site A Hero" } };
      }
      if (siteId === "site-b-id") {
        return { status: "PUBLISHED", publishedData: { headline: "Site B Hero" } };
      }
      return null;
    });

    const app = await createTestApp();
    const siteAResponse = await request(app)
      .get("/public/cms/section?page=home&section=hero")
      .set("x-site-slug", "site-a")
      .set("Host", "localhost");

    const siteBResponse = await request(app)
      .get("/public/cms/section?page=home&section=hero")
      .set("x-site-slug", "site-b")
      .set("Host", "localhost");

    expect(siteAResponse.status).toBe(200);
    expect(siteBResponse.status).toBe(200);
    expect(siteAResponse.body.data).toEqual({ headline: "Site A Hero" });
    expect(siteBResponse.body.data).toEqual({ headline: "Site B Hero" });
  });

  it("does not let admin use an unauthorized site id override", async () => {
    const app = await createTestApp();
    const token = signAdminToken({ id: "admin-1", email: "admin@dsgnfi.com" });

    mockPrisma.membership.findMany.mockResolvedValue([
      {
        tenantId: "tenant-a",
        role: "OWNER",
        tenant: { id: "tenant-a", slug: "tenant-a", name: "Tenant A" },
      },
    ]);

    mockPrisma.site.findUnique.mockResolvedValue({
      id: "site-b-id",
      tenantId: "tenant-b",
      slug: "site-b",
      status: "ACTIVE",
      tenant: { id: "tenant-b", slug: "tenant-b", name: "Tenant B" },
    });

    mockPrisma.membership.findFirst.mockResolvedValue(null);

    mockPrisma.site.findFirst.mockResolvedValue({
      id: "site-a-id",
      tenantId: "tenant-a",
      slug: "main",
      status: "ACTIVE",
      isDefault: true,
      tenant: { id: "tenant-a", slug: "tenant-a", name: "Tenant A" },
    });

    mockPrisma.cmsSection.findUnique.mockResolvedValue({
      page: "home",
      section: "hero",
      status: "PUBLISHED",
      draftData: {},
      publishedData: { headline: "Tenant A Hero" },
      publishedAt: null,
    });

    const response = await request(app)
      .get("/admin/cms/section?page=home&section=hero")
      .set("Cookie", [`cms_token=${token}`])
      .set("x-site-id", "site-b-id");

    expect(response.status).toBe(200);
    expect(mockPrisma.cmsSection.findUnique).toHaveBeenCalledWith({
      where: {
        siteId_page_section: {
          siteId: "site-a-id",
          page: "home",
          section: "hero",
        },
      },
    });
  });

  it("resolves public site by host domain mapping", async () => {
    mockPrisma.siteDomain.findFirst.mockResolvedValue({
      site: {
        id: "site-hosted",
        tenantId: "tenant-hosted",
        slug: "hosted-site",
        status: "ACTIVE",
        tenant: { id: "tenant-hosted", slug: "tenant-hosted", name: "Hosted Tenant" },
      },
    });

    mockPrisma.cmsSection.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      publishedData: { headline: "Hosted Hero" },
    });

    const app = await createTestApp();
    const response = await request(app)
      .get("/public/cms/section?page=home&section=hero")
      .set("Host", "site.example.test");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ headline: "Hosted Hero" });
    expect(mockPrisma.cmsSection.findUnique).toHaveBeenCalledWith({
      where: {
        siteId_page_section: {
          siteId: "site-hosted",
          page: "home",
          section: "hero",
        },
      },
    });
  });

  it("fails safely when no public site can be resolved", async () => {
    mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
    mockPrisma.site.findFirst.mockResolvedValue(null);

    const app = await createTestApp();
    const response = await request(app)
      .get("/public/cms/section?page=home&section=hero")
      .set("Host", "unknown-host.test");

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
  });

  it("extends /auth/me with memberships and current tenant/site context", async () => {
    const app = await createTestApp();
    const token = signAdminToken({ id: "admin-1", email: "admin@dsgnfi.com" });

    const membershipRows = [
      {
        tenantId: "tenant-default",
        role: "OWNER",
        tenant: {
          id: "tenant-default",
          slug: "dsgnfi",
          name: "Dsgnfi",
          sites: [
            {
              id: "site-main",
              name: "Main Site",
              slug: "main",
              status: "ACTIVE",
              isDefault: true,
            },
          ],
        },
      },
    ];

    mockPrisma.membership.findMany.mockResolvedValue(membershipRows);
    mockPrisma.site.findFirst.mockResolvedValue({
      id: "site-main",
      tenantId: "tenant-default",
      slug: "main",
      status: "ACTIVE",
      isDefault: true,
      tenant: { id: "tenant-default", slug: "dsgnfi", name: "Dsgnfi" },
    });

    const response = await request(app)
      .get("/auth/me")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe("admin-1");
    expect(response.body.email).toBe("admin@dsgnfi.com");
    expect(response.body.memberships).toHaveLength(1);
    expect(response.body.currentTenant.slug).toBe("dsgnfi");
    expect(response.body.currentSite.slug).toBe("main");
    expect(response.body.currentRole).toBe("OWNER");
  });
});
