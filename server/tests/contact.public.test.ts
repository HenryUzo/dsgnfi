import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:5174";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn() },
  contactSubmission: { create: vi.fn() },
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.site.findFirst.mockResolvedValue({
    id: "site-main",
    tenantId: "tenant-main",
    slug: "main",
    status: "ACTIVE",
    isDefault: true,
    tenant: { id: "tenant-main", slug: "dsgnfi", name: "Dsgnfi" },
  });
  mockPrisma.contactSubmission.create.mockResolvedValue({
    id: "submission-1",
  });
});

describe("public contact submissions", () => {
  it("stores a valid site-scoped contact submission", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/public/contact")
      .set("Host", "localhost")
      .set("User-Agent", "contact-test-agent")
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        company: "Analytical Engines",
        jobTitle: "Founder",
        message: "We want to start a project.",
        pagePath: "/contact",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalledWith({
      data: {
        siteId: "site-main",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        company: "Analytical Engines",
        jobTitle: "Founder",
        message: "We want to start a project.",
        pagePath: "/contact",
        userAgent: "contact-test-agent",
      },
    });
  });

  it("returns field errors for invalid submissions", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/public/contact")
      .set("Host", "localhost")
      .send({
        email: "not-an-email",
        company: "",
        message: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("validation_failed");
    expect(response.body.error.fieldErrors.email).toBeTruthy();
    expect(response.body.error.fieldErrors.company).toBeTruthy();
    expect(response.body.error.fieldErrors.message).toBeTruthy();
    expect(mockPrisma.contactSubmission.create).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without storing them", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/public/contact")
      .set("Host", "localhost")
      .send({
        email: "ada@example.com",
        company: "Analytical Engines",
        message: "We want to start a project.",
        website: "https://spam.example",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(mockPrisma.contactSubmission.create).not.toHaveBeenCalled();
  });
});
