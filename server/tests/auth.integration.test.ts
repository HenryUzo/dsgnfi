import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

const mockPrisma = {
  adminUser: { findUnique: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn() },
  siteDomain: { findFirst: vi.fn() },
  cmsSection: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  workPageMeta: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  workTag: {
    findMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workProject: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  workProjectTag: { count: vi.fn(), upsert: vi.fn() },
  tenant: { upsert: vi.fn() },
  $queryRawUnsafe: vi.fn(),
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

async function createTestAppFresh() {
  vi.resetModules();
  const module = await import("../src/app");
  return module.createApp();
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.adminUser.findUnique.mockResolvedValue(null);
  mockPrisma.membership.findMany.mockResolvedValue([]);
  mockPrisma.membership.findFirst.mockResolvedValue(null);
  mockPrisma.site.findFirst.mockResolvedValue(null);
  mockPrisma.site.findUnique.mockResolvedValue(null);
  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.cmsSection.findUnique.mockResolvedValue(null);
});

describe("auth integration", () => {
  it("sets the cms_token cookie on successful login with safe local dev options", async () => {
    const passwordHash = await bcrypt.hash("MyStrongPassword123!", 10);
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      passwordHash,
    });

    const app = await createTestApp();
    const response = await request(app)
      .post("/auth/login")
      .set("Origin", "http://localhost:5173")
      .send({
        email: "admin@dsgnfi.com",
        password: "MyStrongPassword123!",
      });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");

    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toBeTruthy();
    expect(setCookie?.[0]).toContain("cms_token=");
    expect(setCookie?.[0]).toContain("HttpOnly");
    expect(setCookie?.[0]).toContain("Path=/");
    expect(setCookie?.[0]).toContain("SameSite=Lax");
    expect(setCookie?.[0]).not.toContain("Secure");
  });

  it("returns the current authenticated user after login when the cookie is replayed", async () => {
    const passwordHash = await bcrypt.hash("MyStrongPassword123!", 10);
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      passwordHash,
    });

    const agent = request.agent(await createTestApp());

    const loginResponse = await agent
      .post("/auth/login")
      .set("Origin", "http://localhost:5173")
      .send({
        email: "admin@dsgnfi.com",
        password: "MyStrongPassword123!",
      });

    expect(loginResponse.status).toBe(200);

    const meResponse = await agent
      .get("/auth/me")
      .set("Origin", "http://localhost:5173");

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toMatchObject({
      ok: true,
      id: "admin-1",
      email: "admin@dsgnfi.com",
    });
  });

  it("returns 401 for unauthenticated /auth/me requests", async () => {
    const app = await createTestApp();
    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      error: { message: "Not authenticated" },
    });
  });

  it("returns 401 when /auth/me receives an invalid cms_token cookie", async () => {
    const app = await createTestApp();
    const response = await request(app)
      .get("/auth/me")
      .set("Cookie", ["cms_token=this-is-not-a-valid-jwt"]);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      error: { message: "Not authenticated" },
    });
  });

  it("accepts a cms_token produced by the shared JWT signer on /auth/me", async () => {
    const { signToken } = await import("../src/auth/jwt");
    const token = signToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
    });

    const app = await createTestApp();
    const response = await request(app)
      .get("/auth/me")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      id: "admin-1",
      email: "admin@dsgnfi.com",
    });
  });

  it("accepts a cms_token when tenantId and siteId are opaque non-UUID strings", async () => {
    const { signToken } = await import("../src/auth/jwt");
    const token = signToken({
      id: "7098bee4-c333-4c5a-a99f-38109e9cb741",
      email: "admin@dsgnfi.com",
      tenantId: "98dfc45f-2135-9e3e-6bf4-de18f1ca2e2e",
      siteId: "74ef4da8-4bf9-ffec-6a13-135e6adee443",
    });

    const app = await createTestApp();
    const response = await request(app)
      .get("/auth/me")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      id: "7098bee4-c333-4c5a-a99f-38109e9cb741",
      email: "admin@dsgnfi.com",
    });
  });

  it("returns 401 when login credentials are wrong and does not set a cookie", async () => {
    const passwordHash = await bcrypt.hash("MyStrongPassword123!", 10);
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      passwordHash,
    });

    const app = await createTestApp();
    const response = await request(app)
      .post("/auth/login")
      .set("Origin", "http://localhost:5173")
      .send({
        email: "admin@dsgnfi.com",
        password: "wrong-password",
      });

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("uses SameSite=None and Secure for the auth cookie in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCorsOrigin = process.env.CORS_ORIGIN;
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGIN =
      "https://admin.dsgnfi.com,https://www.dsgnfi.com,https://dsgnfi.com";

    try {
      const passwordHash = await bcrypt.hash("MyStrongPassword123!", 10);
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: "admin-1",
        email: "admin@dsgnfi.com",
        passwordHash,
      });

      const app = await createTestAppFresh();
      const response = await request(app)
        .post("/auth/login")
        .set("Origin", "https://admin.dsgnfi.com")
        .send({
          email: "admin@dsgnfi.com",
          password: "MyStrongPassword123!",
        });

      expect(response.status).toBe(200);
      const setCookie = response.headers["set-cookie"];
      expect(setCookie).toBeTruthy();
      expect(setCookie?.[0]).toContain("cms_token=");
      expect(setCookie?.[0]).toContain("HttpOnly");
      expect(setCookie?.[0]).toContain("Path=/");
      expect(setCookie?.[0]).toContain("SameSite=None");
      expect(setCookie?.[0]).toContain("Secure");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.CORS_ORIGIN = previousCorsOrigin;
      vi.resetModules();
    }
  });
});
