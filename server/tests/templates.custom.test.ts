import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:3000,http://localhost:5174";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

let createdTemplate: any = null;

const mockPrisma = {
  siteDomain: { findFirst: vi.fn() },
  site: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  membership: { findMany: vi.fn(), findFirst: vi.fn() },
  template: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  templateVersion: {
    updateMany: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
  },
  auditLog: { create: vi.fn() },
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

function signAdminToken() {
  return jwt.sign(
    {
      id: "admin-1",
      email: "admin@dsgnfi.com",
      tenantId: "tenant-1",
      siteId: "site-main",
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

function setupAdminContext(role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" = "OWNER") {
  const site = {
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

  mockPrisma.membership.findMany.mockResolvedValue([
    {
      tenantId: "tenant-1",
      role,
      tenant: {
        id: "tenant-1",
        slug: "dsgnfi",
        name: "Dsgnfi",
        sites: [
          {
            id: site.id,
            name: site.name,
            slug: site.slug,
            status: site.status,
            isDefault: site.isDefault,
          },
        ],
      },
    },
  ]);

  mockPrisma.membership.findFirst.mockResolvedValue({
    tenantId: "tenant-1",
    role,
  });

  mockPrisma.site.findUnique.mockResolvedValue(site);
  mockPrisma.site.findFirst.mockImplementation(async (args: any) => {
    if (args?.where?.id === "site-main" && args?.where?.tenantId === "tenant-1") {
      return site;
    }
    return null;
  });
  mockPrisma.site.groupBy.mockResolvedValue([]);
}

function setupStarterTemplateMocks() {
  mockPrisma.template.upsert.mockImplementation(async (args: any) => ({
    id: `template-${args.where.key}`,
    key: args.where.key,
    name: args.create?.name ?? args.update?.name ?? args.where.key,
    category: args.create?.category ?? args.update?.category ?? "agency",
    description: args.create?.description ?? args.update?.description ?? "",
    status: "ACTIVE",
    sourceType: "STARTER",
    tenantId: null,
    baseTemplateKey: null,
    createdBy: null,
    draftName: null,
    draftCategory: null,
    draftDescription: null,
    draftPresetOverrides: null,
  }));
  mockPrisma.templateVersion.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.templateVersion.upsert.mockImplementation(async (args: any) => ({
    id: `template-version-${args.where.templateId_version.templateId}`,
    templateId: args.where.templateId_version.templateId,
    version: args.where.templateId_version.version,
    manifestKey: args.create?.manifestKey ?? args.update?.manifestKey ?? "agency-starter",
    isActive: true,
    presetOverrides: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  createdTemplate = null;
  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  mockPrisma.template.findMany.mockResolvedValue([]);
  mockPrisma.auditLog.create.mockResolvedValue({});
  setupAdminContext();
  setupStarterTemplateMocks();

  mockPrisma.template.findUnique.mockImplementation(async (args: any) => {
    if (args?.where?.key === "agency-starter") {
      return {
        id: "template-agency-starter",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency template",
        status: "ACTIVE",
        sourceType: "STARTER",
        tenantId: null,
        baseTemplateKey: null,
        createdBy: null,
        draftName: null,
        draftCategory: null,
        draftDescription: null,
        draftPresetOverrides: null,
        tenant: null,
        versions: [
          {
            id: "version-agency",
            version: "1.0.0",
            manifestKey: "agency-starter",
            isActive: true,
            presetOverrides: null,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
          },
        ],
      };
    }

    if (createdTemplate && args?.where?.key === createdTemplate.key) {
      return createdTemplate;
    }

    return null;
  });

  mockPrisma.template.findFirst.mockImplementation(async (args: any) => {
    if (createdTemplate && args?.where?.id === createdTemplate.id) {
      return createdTemplate;
    }
    return null;
  });

  mockPrisma.template.create.mockImplementation(async (args: any) => {
    createdTemplate = {
      id: "template-custom-1",
      key: args.data.key,
      name: args.data.name,
      category: args.data.category,
      description: args.data.description,
      status: "ACTIVE",
      sourceType: "CUSTOM",
      tenantId: "tenant-1",
      baseTemplateKey: args.data.baseTemplateKey,
      createdBy: args.data.createdBy,
      draftName: args.data.draftName,
      draftCategory: args.data.draftCategory,
      draftDescription: args.data.draftDescription,
      draftPresetOverrides: args.data.draftPresetOverrides,
      tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
      versions: [],
    };
    return createdTemplate;
  });

  mockPrisma.template.update.mockImplementation(async (args: any) => {
    createdTemplate = {
      ...createdTemplate,
      ...(args.data?.draftName ? { draftName: args.data.draftName } : {}),
      ...(args.data?.draftDescription ? { draftDescription: args.data.draftDescription } : {}),
      ...(args.data?.draftCategory ? { draftCategory: args.data.draftCategory } : {}),
      ...(args.data?.draftPresetOverrides
        ? { draftPresetOverrides: args.data.draftPresetOverrides }
        : {}),
      ...(args.data?.name ? { name: args.data.name } : {}),
      ...(args.data?.description ? { description: args.data.description } : {}),
      ...(args.data?.category ? { category: args.data.category } : {}),
    };
    return createdTemplate;
  });

  mockPrisma.templateVersion.create.mockImplementation(async (args: any) => {
    const version = {
      id: "version-custom-2",
      templateId: createdTemplate.id,
      version: args.data.version,
      manifestKey: args.data.manifestKey,
      isActive: true,
      presetOverrides: args.data.presetOverrides,
      createdAt: new Date("2026-05-14T00:00:00.000Z"),
    };
    createdTemplate = {
      ...createdTemplate,
      versions: [
        version,
        ...(createdTemplate?.versions ?? []).map((entry: any) => ({
          ...entry,
          isActive: false,
        })),
      ],
    };
    return version;
  });
});

describe("custom template admin routes", () => {
  it("creates a custom template from a starter template", async () => {
    const app = await createTestApp();
    const token = signAdminToken();

    const response = await request(app)
      .post("/admin/templates")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Studio Custom",
        description: "Preset for branded launches",
        category: "agency",
        sourceTemplateKey: "agency-starter",
      });

    expect(response.status).toBe(201);
    expect(response.body.template).toMatchObject({
      sourceType: "CUSTOM",
      baseTemplateKey: "agency-starter",
      name: "Studio Custom",
    });
  });

  it("rejects invalid page overrides when updating a custom template", async () => {
    createdTemplate = {
      id: "template-custom-1",
      key: "agency-starter--studio-custom--abc123",
      name: "Studio Custom",
      category: "agency",
      description: "Preset",
      status: "ACTIVE",
      sourceType: "CUSTOM",
      tenantId: "tenant-1",
      baseTemplateKey: "agency-starter",
      createdBy: "admin-1",
      draftName: "Studio Custom",
      draftCategory: "agency",
      draftDescription: "Preset",
      draftPresetOverrides: {},
      tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
      versions: [],
    };

    const app = await createTestApp();
    const token = signAdminToken();

    const response = await request(app)
      .patch("/admin/templates/template-custom-1")
      .set("Cookie", [`cms_token=${token}`])
      .send({
        name: "Studio Custom",
        description: "Preset",
        category: "agency",
        presetOverrides: {
          supportedPages: [
            {
              pageKey: "missing",
              title: "Missing",
              slug: "/missing",
            },
          ],
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("template_validation_failed");
  });

  it("publishes a new custom template version", async () => {
    createdTemplate = {
      id: "template-custom-1",
      key: "agency-starter--studio-custom--abc123",
      name: "Studio Custom",
      category: "agency",
      description: "Preset",
      status: "ACTIVE",
      sourceType: "CUSTOM",
      tenantId: "tenant-1",
      baseTemplateKey: "agency-starter",
      createdBy: "admin-1",
      draftName: "Studio Custom",
      draftCategory: "agency",
      draftDescription: "Preset",
      draftPresetOverrides: {
        starterSiteSettings: { tagline: "Studio custom" },
      },
      tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
      versions: [
        {
          id: "version-custom-1",
          version: "1.0.0",
          manifestKey: "agency-starter",
          isActive: true,
          presetOverrides: null,
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
        },
      ],
    };

    const app = await createTestApp();
    const token = signAdminToken();

    const response = await request(app)
      .post("/admin/templates/template-custom-1/publish")
      .set("Cookie", [`cms_token=${token}`]);

    expect(response.status).toBe(200);
    expect(mockPrisma.templateVersion.create).toHaveBeenCalled();
    expect(response.body.template.activeVersion.version).toBe("1.0.1");
  });
});
