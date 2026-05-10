import { Prisma } from "@prisma/client";
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

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  siteSettings: { create: vi.fn() },
  page: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  pageRevision: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
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
  adminUser: { findUnique: vi.fn() },
  tenant: { upsert: vi.fn() },
  template: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  templateVersion: { updateMany: vi.fn(), upsert: vi.fn() },
  $queryRawUnsafe: vi.fn(),
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

function signAdminToken(payload: {
  id: string;
  email: string;
  tenantId?: string;
  siteId?: string;
}) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

function createUniqueError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

function setupTemplateBootstrapMocks() {
  mockPrisma.template.upsert.mockImplementation(async (args: any) => ({
    id: `template-${args.where.key}`,
    key: args.where.key,
    name: args.create?.name ?? args.update?.name ?? args.where.key,
    category: args.create?.category ?? args.update?.category ?? "agency",
    description: args.create?.description ?? args.update?.description ?? "",
    status: "ACTIVE",
  }));

  mockPrisma.templateVersion.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.templateVersion.upsert.mockImplementation(async (args: any) => ({
    id: `template-version-${args.where.templateId_version.templateId}`,
    templateId: args.where.templateId_version.templateId,
    version: args.where.templateId_version.version,
    manifestKey: args.create?.manifestKey ?? args.update?.manifestKey ?? "agency-starter",
    isActive: true,
  }));
}

function setupAdminTenantContext() {
  const mainSite = {
    id: "site-main",
    tenantId: "tenant-1",
    slug: "main",
    name: "Main Site",
    status: "ACTIVE",
    isDefault: true,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
  };

  const branchSite = {
    id: "site-branch",
    tenantId: "tenant-1",
    slug: "branch",
    name: "Branch Site",
    status: "DRAFT",
    isDefault: false,
    createdAt: new Date("2026-04-02T00:00:00.000Z"),
    updatedAt: new Date("2026-04-02T00:00:00.000Z"),
    tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
  };

  const foreignSite = {
    id: "site-foreign",
    tenantId: "tenant-2",
    slug: "foreign",
    name: "Foreign Site",
    status: "ACTIVE",
    isDefault: true,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    tenant: { id: "tenant-2", slug: "other", name: "Other Tenant" },
  };

  mockPrisma.membership.findMany.mockResolvedValue([
    {
      tenantId: "tenant-1",
      role: "OWNER",
      tenant: {
        id: "tenant-1",
        slug: "dsgnfi",
        name: "Dsgnfi",
        sites: [
          {
            id: mainSite.id,
            name: mainSite.name,
            slug: mainSite.slug,
            status: mainSite.status,
            isDefault: mainSite.isDefault,
          },
          {
            id: branchSite.id,
            name: branchSite.name,
            slug: branchSite.slug,
            status: branchSite.status,
            isDefault: branchSite.isDefault,
          },
        ],
      },
    },
  ]);

  mockPrisma.membership.findFirst.mockResolvedValue({
    tenantId: "tenant-1",
    role: "OWNER",
  });

  mockPrisma.site.findUnique.mockImplementation(async (args: any) => {
    const id = args?.where?.id;
    if (id === mainSite.id) return mainSite;
    if (id === branchSite.id) return branchSite;
    if (id === foreignSite.id) return foreignSite;
    return null;
  });

  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    if (args?.where?.id === foreignSite.id && args?.where?.tenantId === "tenant-1") {
      return null;
    }

    if (args?.where?.id === branchSite.id && args?.where?.tenantId === "tenant-1") {
      return {
        ...branchSite,
        template: null,
        templateVersion: null,
        settings: null,
      };
    }

    if (args?.where?.id === "site-created" && args?.where?.tenantId === "tenant-1") {
      return {
        id: "site-created",
        tenantId: "tenant-1",
        name: "Clinic West",
        slug: "clinic-west",
        status: "DRAFT",
        isDefault: false,
        createdAt: new Date("2026-04-04T00:00:00.000Z"),
        updatedAt: new Date("2026-04-04T00:00:00.000Z"),
        template: {
          id: "template-clinic-starter",
          key: "clinic-starter",
          name: "Clinic Starter",
          category: "healthcare",
          description: "Clinic template",
          status: "ACTIVE",
        },
        templateVersion: {
          id: "template-version-clinic-starter",
          version: "1.0.0",
          manifestKey: "clinic-starter",
          isActive: true,
        },
        settings: {
          logoUrl: null,
          faviconUrl: null,
          tagline: "Patient-centered care with a modern digital front door.",
          contactEmail: "appointments@example.com",
          contactPhone: null,
          address: null,
          socialLinks: null,
          seoTitle: "Clinic Starter",
          seoDescription: "Starter template for clinics and medical practices.",
          theme: { primaryColor: "#0F766E", accentColor: "#E2E8F0" },
          locale: "en",
          timezone: "Africa/Lagos",
        },
      };
    }

    if (args?.where?.tenantId === "tenant-1" && !args?.where?.id) {
      return {
        ...mainSite,
        template: null,
        templateVersion: null,
        settings: null,
      };
    }

    return null;
  });

  mockPrisma.site.findMany.mockResolvedValue([
    {
      id: mainSite.id,
      tenantId: "tenant-1",
      name: mainSite.name,
      slug: mainSite.slug,
      status: mainSite.status,
      isDefault: true,
      createdAt: mainSite.createdAt,
      updatedAt: mainSite.updatedAt,
      template: {
        id: "template-agency-starter",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency template",
        status: "ACTIVE",
      },
      templateVersion: {
        id: "template-version-agency",
        version: "1.0.0",
        manifestKey: "agency-starter",
        isActive: true,
      },
      settings: null,
    },
    {
      id: branchSite.id,
      tenantId: "tenant-1",
      name: branchSite.name,
      slug: branchSite.slug,
      status: branchSite.status,
      isDefault: false,
      createdAt: branchSite.createdAt,
      updatedAt: branchSite.updatedAt,
      template: null,
      templateVersion: null,
      settings: null,
    },
  ]);

  return { mainSite, branchSite, foreignSite };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.site.findFirst.mockResolvedValue(null);
  mockPrisma.site.findUnique.mockResolvedValue(null);
  mockPrisma.site.findMany.mockResolvedValue([]);
  mockPrisma.site.create.mockResolvedValue(null);
  mockPrisma.siteSettings.create.mockResolvedValue(null);
  mockPrisma.membership.findMany.mockResolvedValue([]);
  mockPrisma.membership.findFirst.mockResolvedValue(null);
  mockPrisma.page.findUnique.mockResolvedValue(null);
  mockPrisma.page.findMany.mockResolvedValue([]);
  mockPrisma.page.create.mockImplementation(async (args: any) => ({
    id: `page-${args.data.pageKey}`,
    ...args.data,
  }));
  mockPrisma.page.update.mockResolvedValue({});
  mockPrisma.pageRevision.create.mockImplementation(async (args: any) => ({
    id: `revision-${args.data.pageId}-${args.data.revisionNumber}`,
    ...args.data,
  }));
  mockPrisma.pageRevision.findFirst.mockResolvedValue(null);
  mockPrisma.pageRevision.findMany.mockResolvedValue([]);
  mockPrisma.cmsSection.findUnique.mockResolvedValue(null);
  mockPrisma.workPageMeta.upsert.mockResolvedValue({});
  mockPrisma.template.findMany.mockResolvedValue([]);
  mockPrisma.template.findUnique.mockResolvedValue(null);
  mockPrisma.template.upsert.mockResolvedValue(null);
  mockPrisma.templateVersion.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.templateVersion.upsert.mockResolvedValue(null);
});

describe("Sprint 2 admin routes", () => {
  it("authenticated admin can switch to an authorized site", async () => {
    const { branchSite } = setupAdminTenantContext();
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/auth/switch-site")
      .set("Cookie", [`cms_token=${token}`])
      .send({ siteId: branchSite.id });

    expect(response.status).toBe(200);
    expect(response.body.currentSite).toMatchObject({
      id: branchSite.id,
      slug: branchSite.slug,
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("cms_token=");
  });

  it("rejects unauthorized site switching outside the current tenant", async () => {
    const { foreignSite } = setupAdminTenantContext();
    mockPrisma.membership.findFirst.mockResolvedValue({ tenantId: "tenant-2", role: "OWNER" });

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/auth/switch-site")
      .set("Cookie", [`cms_token=${token}`])
      .send({ siteId: foreignSite.id });

    expect(response.status).toBe(403);
    expect(response.body.ok).toBe(false);
  });

  it("GET /admin/templates returns active templates", async () => {
    setupAdminTenantContext();
    setupTemplateBootstrapMocks();
    mockPrisma.template.findMany.mockResolvedValue([
      {
        id: "template-agency-starter",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency template",
        status: "ACTIVE",
        versions: [{ id: "v1", version: "1.0.0", manifestKey: "agency-starter", isActive: true }],
      },
    ]);

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/templates")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.templates).toHaveLength(1);
    expect(response.body.templates[0]).toMatchObject({
      key: "agency-starter",
      status: "ACTIVE",
    });
  });

  it("GET /admin/templates/:templateKey returns the correct template", async () => {
    setupAdminTenantContext();
    setupTemplateBootstrapMocks();
    mockPrisma.template.findUnique.mockResolvedValue({
      id: "template-clinic-starter",
      key: "clinic-starter",
      name: "Clinic Starter",
      category: "healthcare",
      description: "Clinic template",
      status: "ACTIVE",
      versions: [
        {
          id: "version-clinic",
          version: "1.0.0",
          manifestKey: "clinic-starter",
          isActive: true,
        },
      ],
    });

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/templates/clinic-starter")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.template).toMatchObject({
      key: "clinic-starter",
      activeVersion: { version: "1.0.0" },
    });
  });

  it("GET /admin/sites returns only sites in the accessible tenant context", async () => {
    setupAdminTenantContext();
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get("/admin/sites")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body.sites).toHaveLength(2);
    expect(response.body.sites.every((site: any) => ["site-main", "site-branch"].includes(site.id))).toBe(true);
  });

  it("GET /admin/sites/:siteId rejects cross-tenant access", async () => {
    const { foreignSite } = setupAdminTenantContext();
    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .get(`/admin/sites/${foreignSite.id}`)
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
  });

  it("POST /admin/sites creates a site with default settings", async () => {
    setupAdminTenantContext();
    setupTemplateBootstrapMocks();
    mockPrisma.template.findUnique.mockResolvedValue({
      id: "template-clinic-starter",
      key: "clinic-starter",
      name: "Clinic Starter",
      category: "healthcare",
      description: "Clinic template",
      status: "ACTIVE",
      versions: [
        {
          id: "template-version-clinic-starter",
          version: "1.0.0",
          manifestKey: "clinic-starter",
          isActive: true,
        },
      ],
    });
    mockPrisma.site.create.mockResolvedValue({
      id: "site-created",
      tenantId: "tenant-1",
    });
    mockPrisma.siteSettings.create.mockResolvedValue({});
    mockPrisma.workPageMeta.upsert.mockResolvedValue({});

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/sites")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Clinic West",
        slug: "clinic-west",
        templateKey: "clinic-starter",
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.site.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          name: "Clinic West",
          slug: "clinic-west",
          templateId: "template-clinic-starter",
          templateVersionId: "template-version-clinic-starter",
        }),
      })
    );
    expect(mockPrisma.siteSettings.create).toHaveBeenCalled();
    expect(response.body.site).toMatchObject({
      id: "site-created",
      slug: "clinic-west",
    });
  });

  it("POST /admin/sites rejects duplicate slug within the same tenant", async () => {
    setupAdminTenantContext();
    setupTemplateBootstrapMocks();
    mockPrisma.site.create.mockRejectedValue(createUniqueError());

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/sites")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Main Site Duplicate",
        slug: "main",
      });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("Site slug already exists");
    expect(response.body.error.code).toBe("site_slug_conflict");
    expect(response.body.error.fieldErrors.slug[0]).toContain("Site slug already exists");
  });

  it("POST /admin/sites rejects invalid template selections without partial site writes", async () => {
    setupAdminTenantContext();
    setupTemplateBootstrapMocks();
    mockPrisma.template.findUnique.mockResolvedValue(null);

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/sites")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Unknown Template Site",
        slug: "unknown-template-site",
        templateKey: "missing-template",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("site_template_invalid");
    expect(response.body.error.fieldErrors.templateKey[0]).toContain("invalid");
    expect(mockPrisma.site.create).not.toHaveBeenCalled();
    expect(mockPrisma.siteSettings.create).not.toHaveBeenCalled();
    expect(mockPrisma.workPageMeta.upsert).not.toHaveBeenCalled();
  });

  it("POST /admin/sites blocks editors from managing sites", async () => {
    setupAdminTenantContext();
    mockPrisma.membership.findFirst.mockResolvedValue({
      tenantId: "tenant-1",
      role: "EDITOR",
    });

    const app = await createTestApp();
    const token = signAdminToken({
      id: "editor-1",
      email: "editor@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/sites")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Blocked",
        slug: "blocked",
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("insufficient_role");
    expect(mockPrisma.site.create).not.toHaveBeenCalled();
  });

  it("POST /admin/sites links template correctly when templateKey is provided", async () => {
    setupAdminTenantContext();
    setupTemplateBootstrapMocks();
    mockPrisma.template.findUnique.mockResolvedValue({
      id: "template-agency-starter",
      key: "agency-starter",
      name: "Agency Starter",
      category: "agency",
      description: "Agency template",
      status: "ACTIVE",
      versions: [
        {
          id: "template-version-agency",
          version: "1.0.0",
          manifestKey: "agency-starter",
          isActive: true,
        },
      ],
    });
    mockPrisma.site.create.mockResolvedValue({
      id: "site-created",
      tenantId: "tenant-1",
    });

    const app = await createTestApp();
    const token = signAdminToken({
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    });

    const response = await request(app)
      .post("/admin/sites")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Agency East",
        slug: "agency-east",
        templateKey: "agency-starter",
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.site.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: "template-agency-starter",
          templateVersionId: "template-version-agency",
        }),
      })
    );
  });
});
