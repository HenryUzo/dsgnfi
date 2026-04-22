import fs from "node:fs";
import path from "node:path";

import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:5173,http://127.0.0.1:5173";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.BACKEND_ORIGIN = "http://localhost:4000";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

let state: any;

const mockPrisma = {
  $queryRawUnsafe: vi.fn(),
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn() },
  siteDomain: { findFirst: vi.fn() },
  auditLog: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("../src/db/prisma", () => ({ prisma: mockPrisma }));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

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

function setupMocks() {
  mockPrisma.$queryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);
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
  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);

  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    let sites = state.sites.filter((site: any) => site.status !== "ARCHIVED");
    if (where.slug) {
      sites = sites.filter((site: any) => site.slug === where.slug);
    }
    if (where.tenant?.slug) {
      sites = sites.filter((site: any) => site.tenant.slug === where.tenant.slug);
    }
    if (where.isDefault === true) {
      sites = sites.filter((site: any) => site.isDefault);
    }
    if (where.tenantId) {
      sites = sites.filter((site: any) => site.tenantId === where.tenantId);
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
      tenant: site.tenant,
      settings: args?.include?.settings ? settings : undefined,
      pages: args?.include?.pages ? pages : undefined,
    });
  });

  mockPrisma.auditLog.findMany.mockImplementation(async (args: any) => {
    let entries = state.auditLogs.filter((entry: any) => entry.siteId === args.where.siteId);
    if (args.where.action) {
      entries = entries.filter((entry: any) => entry.action === args.where.action);
    }
    entries = entries
      .slice()
      .sort(
        (a: any, b: any) =>
          Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))
      )
      .slice(0, args.take ?? 25);

    return clone(
      entries.map((entry: any) => ({
        ...entry,
        actorAdminUser: entry.actorAdminUserId
          ? {
              id: entry.actorAdminUserId,
              email: "admin@dsgnfi.com",
            }
          : null,
      }))
    );
  });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

describe("Sprint 6 release readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      ],
      siteSettings: [
        {
          id: "settings-main",
          siteId: "site-main",
          logoUrl: null,
          faviconUrl: null,
          tagline: null,
          contactEmail: null,
          contactPhone: null,
          address: null,
          socialLinks: {},
          seoTitle: null,
          seoDescription: null,
          theme: {},
          primaryNavigation: [],
          footerNavigation: [],
          locale: "en",
          timezone: "Africa/Lagos",
        },
      ],
      pages: [],
      auditLogs: [
        {
          id: "audit-1",
          siteId: "site-main",
          actorAdminUserId: "admin-1",
          action: "preview_token.created",
          entityType: "preview_token",
          entityId: "preview-1",
          metadata: { pageKey: "home", expiresAt: "2026-04-07T12:00:00.000Z" },
          createdAt: "2026-04-07T11:00:00.000Z",
        },
        {
          id: "audit-2",
          siteId: "site-main",
          actorAdminUserId: "admin-1",
          action: "site_settings.updated",
          entityType: "site_settings",
          entityId: "site-main",
          metadata: { siteName: "Main Site" },
          createdAt: "2026-04-07T11:30:00.000Z",
        },
      ],
    };

    setupMocks();
  });

  it("/health returns a healthy process response", async () => {
    const app = await createTestApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.service).toBe("dsgnfi-cms-api");
  });

  it("/ready reflects dependency readiness and returns 503 when the database is unavailable", async () => {
    const app = await createTestApp();

    const readyResponse = await request(app).get("/ready");
    expect(readyResponse.status).toBe(200);
    expect(readyResponse.body.ok).toBe(true);
    expect(readyResponse.body.checks.database).toBe("ok");
    expect(readyResponse.body.checks.config).toBe("ok");

    mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error("db offline"));
    const failedResponse = await request(app).get("/ready");
    expect(failedResponse.status).toBe(503);
    expect(failedResponse.body.ok).toBe(false);
    expect(failedResponse.body.checks.database).toBe("failed");
  });

  it("preview browser origin generation uses configured frontend origin", async () => {
    vi.resetModules();
    const module = await import("../src/services/previewTokens");
    const baseUrl = module.getPreviewBaseUrl({
      protocol: "http",
      get(name: string) {
        if (name === "host") return "localhost:4000";
        if (name === "origin") return undefined;
        if (name === "referer") return undefined;
        return undefined;
      },
    });

    expect(baseUrl).toBe("http://localhost:5173");
  });

  it("unresolved non-local hosts return 404 while localhost still resolves the default site", async () => {
    const app = await createTestApp();

    const unresolved = await request(app)
      .get("/public/site")
      .set("Host", "missing.example.com");
    expect(unresolved.status).toBe(404);
    expect(unresolved.body.error.message).toBe("Site not found.");

    const localhostResponse = await request(app).get("/public/site");
    expect(localhostResponse.status).toBe(200);
    expect(localhostResponse.body.site.slug).toBe("main");
  });

  it("admin audit retrieval is site-scoped and returns recent actions without secrets", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const response = await request(app)
      .get("/admin/audit?limit=1&action=preview_token.created")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0].action).toBe("preview_token.created");
    expect(response.body.entries[0].actor.email).toBe("admin@dsgnfi.com");
    expect(response.body.entries[0].metadata.token).toBeUndefined();
  });

  it("bootstrap and stable test scripts are codified in package.json files", () => {
    const serverPackage = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
    );
    const appPackage = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "../app/package.json"), "utf8")
    );

    expect(serverPackage.scripts["bootstrap:local"]).toContain("seed:admin");
    expect(serverPackage.scripts.verify).toContain("typecheck");
    expect(appPackage.scripts["test:stable"]).toContain("--pool=threads");
    expect(appPackage.scripts.verify).toContain("test:stable");
  });
});
