import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:3000,http://localhost:5173";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.APP_BASE_DOMAIN = "dsgnfi.test";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

let state: any;
let previewCounter = 1;
let domainCounter = 1;
const resolveTxtMock = vi.fn();

vi.mock("node:dns/promises", () => ({
  resolveTxt: resolveTxtMock,
}));

const mockPrisma = {
  siteDomain: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  site: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  previewToken: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  page: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
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

function normalizeHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "").split(":")[0];
}

function setupMocks() {
  mockPrisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
    Promise.all(operations)
  );

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
  mockPrisma.auditLog.create.mockImplementation(async (args: any) => {
    const record = {
      id: `audit-${(state.auditLogs?.length ?? 0) + 1}`,
      createdAt: new Date().toISOString(),
      ...args.data,
    };
    state.auditLogs.push(record);
    return clone(record);
  });

  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    let sites = state.sites.filter((site: any) => site.status !== "ARCHIVED");
    if (where.id) sites = sites.filter((site: any) => site.id === where.id);
    if (where.slug) sites = sites.filter((site: any) => site.slug === where.slug);
    if (where.tenantId) sites = sites.filter((site: any) => site.tenantId === where.tenantId);
    if (where.isDefault === true) sites = sites.filter((site: any) => site.isDefault);
    if (where.tenant?.slug) sites = sites.filter((site: any) => site.tenant.slug === where.tenant.slug);
    return clone(sites[0] ?? null);
  });

  mockPrisma.site.findUnique.mockImplementation(async (args: any) => {
    const site = state.sites.find((entry: any) => entry.id === args?.where?.id);
    if (!site) return null;
    return clone({
      ...site,
      settings: args?.include?.settings
        ? state.siteSettings?.find((entry: any) => entry.siteId === site.id) ?? null
        : undefined,
      pages: args?.include?.pages
        ? state.pages
            .filter((entry: any) => entry.siteId === site.id)
            .map((entry: any) => ({
              pageKey: entry.pageKey,
              slug: entry.slug,
              currentPublishedRevisionId: entry.currentPublishedRevisionId ?? null,
            }))
        : undefined,
    });
  });

  mockPrisma.page.findMany.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    const pages = state.pages.filter((page: any) => {
      if (where.siteId && page.siteId !== where.siteId) return false;
      if (where.pageKey?.in && !where.pageKey.in.includes(page.pageKey)) return false;
      return true;
    });
    return clone(pages);
  });

  mockPrisma.page.findUnique.mockImplementation(async (args: any) => {
    const key = args?.where?.siteId_pageKey;
    if (key) {
      const page = state.pages.find(
        (entry: any) => entry.siteId === key.siteId && entry.pageKey === key.pageKey
      );
      if (!page) return null;
      const currentDraftRevision =
        page.currentDraftRevisionId
          ? state.pageRevisions.find((entry: any) => entry.id === page.currentDraftRevisionId)
          : null;
      const currentPublishedRevision =
        page.currentPublishedRevisionId
          ? state.pageRevisions.find((entry: any) => entry.id === page.currentPublishedRevisionId)
          : null;

      return clone({
        ...page,
        currentDraftRevision: args.include?.currentDraftRevision ? currentDraftRevision : undefined,
        currentPublishedRevision: args.include?.currentPublishedRevision
          ? currentPublishedRevision
          : undefined,
      });
    }
    return null;
  });

  mockPrisma.previewToken.findMany.mockImplementation(async (args: any) =>
    clone(
      state.previewTokens
        .filter((token: any) => token.siteId === args.where.siteId)
        .sort((a: any, b: any) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    )
  );
  mockPrisma.previewToken.create.mockImplementation(async (args: any) => {
    const token = {
      id: `preview-${previewCounter++}`,
      createdAt: new Date().toISOString(),
      pageKey: null,
      note: null,
      revokedAt: null,
      ...args.data,
    };
    state.previewTokens.push(token);
    return clone(token);
  });
  mockPrisma.previewToken.findUnique.mockImplementation(async (args: any) =>
    clone(state.previewTokens.find((entry: any) => entry.tokenHash === args.where.tokenHash) ?? null)
  );
  mockPrisma.previewToken.findFirst.mockImplementation(async (args: any) =>
    clone(
      state.previewTokens.find(
        (entry: any) =>
          (!args.where.id || entry.id === args.where.id) &&
          (!args.where.siteId || entry.siteId === args.where.siteId)
      ) ?? null
    )
  );
  mockPrisma.previewToken.update.mockImplementation(async (args: any) => {
    const token = state.previewTokens.find((entry: any) => entry.id === args.where.id);
    Object.assign(token, args.data);
    return clone(token);
  });

  mockPrisma.siteDomain.findMany.mockImplementation(async (args: any) =>
    clone(
      state.domains
        .filter((entry: any) => entry.siteId === args.where.siteId)
        .sort((a: any, b: any) => Number(b.isPrimary) - Number(a.isPrimary))
    )
  );
  mockPrisma.siteDomain.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where ?? {};
    let domains = state.domains.slice();
    if (where.id) domains = domains.filter((entry: any) => entry.id === where.id);
    if (where.siteId) domains = domains.filter((entry: any) => entry.siteId === where.siteId);
    if (where.hostname) domains = domains.filter((entry: any) => normalizeHost(entry.hostname) === normalizeHost(where.hostname));
    if (where.isPrimary !== undefined) domains = domains.filter((entry: any) => entry.isPrimary === where.isPrimary);
    if (where.type) domains = domains.filter((entry: any) => entry.type === where.type);
    if (where.verificationStatus) domains = domains.filter((entry: any) => entry.verificationStatus === where.verificationStatus);
    if (where.OR) {
      domains = domains.filter((entry: any) =>
        where.OR.some((condition: any) => {
          if (condition.type === "SUBDOMAIN") {
            return entry.type === "SUBDOMAIN";
          }
          return (
            entry.type === condition.type &&
            entry.isPrimary === condition.isPrimary &&
            entry.verificationStatus === condition.verificationStatus
          );
        })
      );
    }

    const domain = domains[0] ?? null;
    if (!domain) return null;
    if (args.include?.site) {
      return clone({
        ...domain,
        site: state.sites.find((site: any) => site.id === domain.siteId),
      });
    }
    return clone(domain);
  });
  mockPrisma.siteDomain.findUnique.mockImplementation(async (args: any) =>
    clone(state.domains.find((entry: any) => entry.id === args.where.id) ?? null)
  );
  mockPrisma.siteDomain.create.mockImplementation(async (args: any) => {
    const hostname = normalizeHost(args.data.hostname);
    if (state.domains.some((entry: any) => normalizeHost(entry.hostname) === hostname)) {
      const error = new Error("duplicate") as any;
      error.code = "P2002";
      throw error;
    }
    const domain = {
      id: `domain-${domainCounter++}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verifiedAt: null,
      lastVerificationAttemptAt: null,
      lastVerificationError: null,
      verificationHost: null,
      verificationValue: null,
      ...args.data,
      hostname,
    };
    state.domains.push(domain);
    return clone(domain);
  });
  mockPrisma.siteDomain.update.mockImplementation(async (args: any) => {
    const domain = state.domains.find((entry: any) => entry.id === args.where.id);
    Object.assign(domain, args.data, { updatedAt: new Date().toISOString() });
    return clone(domain);
  });
  mockPrisma.siteDomain.updateMany.mockImplementation(async (args: any) => {
    const matched = state.domains.filter((entry: any) => {
      if (args.where.siteId && entry.siteId !== args.where.siteId) return false;
      if (args.where.isPrimary !== undefined && entry.isPrimary !== args.where.isPrimary) return false;
      return true;
    });
    matched.forEach((entry: any) => Object.assign(entry, args.data, { updatedAt: new Date().toISOString() }));
    return { count: matched.length };
  });
  mockPrisma.siteDomain.delete.mockImplementation(async (args: any) => {
    state.domains = state.domains.filter((entry: any) => entry.id !== args.where.id);
    return null;
  });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

describe("Sprint 5B preview and domain management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewCounter = 1;
    domainCounter = 1;
    resolveTxtMock.mockReset();
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
      pages: [
        {
          id: "page-home-main",
          siteId: "site-main",
          pageKey: "home",
          slug: "",
          title: "Home",
          status: "PUBLISHED",
          seoTitle: null,
          seoDescription: null,
          currentDraftRevisionId: "rev-home-draft-main",
          currentPublishedRevisionId: "rev-home-published-main",
          updatedAt: new Date("2026-04-07T09:00:00.000Z").toISOString(),
        },
      ],
      pageRevisions: [
        {
          id: "rev-home-draft-main",
          pageId: "page-home-main",
          revisionNumber: 2,
          state: "DRAFT",
          content: {
            blocks: [{ id: "hero-draft", type: "hero", data: { headline: "Draft Hero" } }],
          },
          schemaVersion: 1,
          createdAt: new Date("2026-04-07T09:00:00.000Z").toISOString(),
          publishedAt: null,
        },
        {
          id: "rev-home-published-main",
          pageId: "page-home-main",
          revisionNumber: 1,
          state: "PUBLISHED",
          content: {
            blocks: [{ id: "hero-published", type: "hero", data: { headline: "Published Hero" } }],
          },
          schemaVersion: 1,
          createdAt: new Date("2026-04-07T08:00:00.000Z").toISOString(),
          publishedAt: new Date("2026-04-07T08:00:00.000Z").toISOString(),
        },
      ],
      previewTokens: [],
      domains: [
        {
          id: "sub-main",
          siteId: "site-main",
          hostname: "main.dsgnfi.test",
          type: "SUBDOMAIN",
          isPrimary: true,
          verificationStatus: "VERIFIED",
          verifiedAt: new Date("2026-04-07T07:00:00.000Z").toISOString(),
          verificationHost: null,
          verificationValue: null,
          lastVerificationAttemptAt: null,
          lastVerificationError: null,
          createdAt: new Date("2026-04-07T07:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-07T07:00:00.000Z").toISOString(),
        },
        {
          id: "custom-unverified",
          siteId: "site-main",
          hostname: "preview.example.com",
          type: "CUSTOM",
          isPrimary: false,
          verificationStatus: "PENDING",
          verifiedAt: null,
          verificationHost: "_dsgnfi-verification.preview.example.com",
          verificationValue: "dsgnfi-pending",
          lastVerificationAttemptAt: null,
          lastVerificationError: null,
          createdAt: new Date("2026-04-07T07:10:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-07T07:10:00.000Z").toISOString(),
        },
      ],
      siteSettings: [],
      auditLogs: [],
    };

    setupMocks();
  });

  it("creates preview tokens once and serves draft preview content without leaking on normal public routes", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const createResponse = await request(app)
      .post("/admin/preview/token")
      .set("Cookie", cookie)
      .send({ pageKey: "home", note: "Homepage QA", expiresInMinutes: 60 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.token.token).toBeTruthy();
    expect(createResponse.body.token.previewUrl).toContain(
      "http://localhost:5173/preview/pages/home?token="
    );
    expect(createResponse.body.token.previewApiPath).toContain("/public/preview/pages/home?token=");

    const previewResponse = await request(app).get(
      `/public/preview/pages/home?token=${encodeURIComponent(createResponse.body.token.token)}`
    );
    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.page.content.blocks[0].data.headline).toBe("Draft Hero");

    const publicResponse = await request(app).get("/public/pages/home");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.page.content.blocks[0].data.headline).toBe("Published Hero");

    const listResponse = await request(app)
      .get("/admin/preview")
      .set("Cookie", cookie);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.tokens[0].token).toBeUndefined();
    expect(
      state.auditLogs.some((entry: any) => entry.action === "preview_token.created")
    ).toBe(true);
  });

  it("rejects revoked and expired preview tokens", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const createResponse = await request(app)
      .post("/admin/preview/token")
      .set("Cookie", cookie)
      .send({ pageKey: "home", expiresInMinutes: 60 });

    const tokenId = createResponse.body.token.id as string;
    const rawToken = createResponse.body.token.token as string;

    const revokeResponse = await request(app)
      .delete(`/admin/preview/${tokenId}`)
      .set("Cookie", cookie);
    expect(revokeResponse.status).toBe(204);

    const revokedPreview = await request(app).get(
      `/public/preview/pages/home?token=${encodeURIComponent(rawToken)}`
    );
    expect(revokedPreview.status).toBe(403);
    expect(
      state.auditLogs.some((entry: any) => entry.action === "preview_token.revoked")
    ).toBe(true);

    state.previewTokens.push({
      id: "expired-token",
      siteId: "site-main",
      pageKey: "home",
      tokenHash: state.previewTokens[0].tokenHash.replace(/.$/, "0"),
      expiresAt: new Date("2020-01-01T00:00:00.000Z").toISOString(),
      revokedAt: null,
      note: null,
      createdBy: "admin-1",
      createdAt: new Date("2020-01-01T00:00:00.000Z").toISOString(),
    });

    const expiredResponse = await request(app).get("/public/preview/pages/home?token=expired");
    expect(expiredResponse.status).toBe(403);
  });

  it("creates, lists, and deletes domains in a site-scoped way while rejecting duplicates", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const createSubdomain = await request(app)
      .post("/admin/domains")
      .set("Cookie", cookie)
      .send({ type: "SUBDOMAIN", subdomainLabel: "studio" });
    expect(createSubdomain.status).toBe(201);
    expect(createSubdomain.body.domain.hostname).toBe("studio.dsgnfi.test");

    const createCustom = await request(app)
      .post("/admin/domains")
      .set("Cookie", cookie)
      .send({ type: "CUSTOM", hostname: "www.example.com" });
    expect(createCustom.status).toBe(201);
    expect(createCustom.body.domain.verificationInstructions.host).toBe(
      "_dsgnfi-verification.www.example.com"
    );

    const duplicate = await request(app)
      .post("/admin/domains")
      .set("Cookie", cookie)
      .send({ type: "CUSTOM", hostname: "www.example.com" });
    expect(duplicate.status).toBe(409);

    const listResponse = await request(app)
      .get("/admin/domains")
      .set("Cookie", cookie);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.domains.every((domain: any) => domain.hostname !== "branch.example.com")).toBe(true);

    const deleteResponse = await request(app)
      .delete(`/admin/domains/${createCustom.body.domain.id}`)
      .set("Cookie", cookie);
    expect(deleteResponse.status).toBe(204);
    expect(state.auditLogs.some((entry: any) => entry.action === "domain.created")).toBe(true);
    expect(state.auditLogs.some((entry: any) => entry.action === "domain.deleted")).toBe(true);
  });

  it("blocks unverified custom domains from becoming primary and allows verified custom domains", async () => {
    const app = await createTestApp();
    const cookie = `cms_token=${signAdminToken("site-main")}`;

    const blocked = await request(app)
      .post("/admin/domains/custom-unverified/set-primary")
      .set("Cookie", cookie);
    expect(blocked.status).toBe(400);

    resolveTxtMock.mockResolvedValue([["dsgnfi-pending"]]);
    const verifyResponse = await request(app)
      .post("/admin/domains/custom-unverified/verify")
      .set("Cookie", cookie);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.domain.verificationStatus).toBe("VERIFIED");

    const primaryResponse = await request(app)
      .post("/admin/domains/custom-unverified/set-primary")
      .set("Cookie", cookie);
    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.domain.isPrimary).toBe(true);
    expect(
      state.auditLogs.some((entry: any) => entry.action === "domain.verification_attempted")
    ).toBe(true);
    expect(
      state.auditLogs.some((entry: any) => entry.action === "domain.primary_set")
    ).toBe(true);
  });

  it("ignores unverified custom domains during public resolution and still resolves verified subdomains", async () => {
    const app = await createTestApp();

    const unresolvedCustom = await request(app)
      .get("/public/site")
      .set("Host", "preview.example.com");
    expect(unresolvedCustom.status).toBe(404);
    expect(unresolvedCustom.body.error.message).toBe("Site not found.");

    const localhostFallback = await request(app).get("/public/site");
    expect(localhostFallback.status).toBe(200);
    expect(localhostFallback.body.site.slug).toBe("main");

    state.domains.push({
      id: "custom-verified",
      siteId: "site-branch",
      hostname: "branch.example.com",
      type: "CUSTOM",
      isPrimary: true,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date("2026-04-07T08:00:00.000Z").toISOString(),
      verificationHost: "_dsgnfi-verification.branch.example.com",
      verificationValue: "dsgnfi-verified",
      lastVerificationAttemptAt: new Date("2026-04-07T08:00:00.000Z").toISOString(),
      lastVerificationError: null,
      createdAt: new Date("2026-04-07T08:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-07T08:00:00.000Z").toISOString(),
    });

    const verifiedCustom = await request(app)
      .get("/public/site")
      .set("Host", "branch.example.com");
    expect(verifiedCustom.status).toBe(200);
    expect(verifiedCustom.body.site.slug).toBe("branch");

    const subdomainResponse = await request(app)
      .get("/public/site")
      .set("Host", "main.dsgnfi.test");
    expect(subdomainResponse.status).toBe(200);
    expect(subdomainResponse.body.site.slug).toBe("main");
  });
});
