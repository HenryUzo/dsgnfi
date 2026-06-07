import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 15000 });

process.env.NODE_ENV = "development";
process.env.CORS_ORIGIN = "http://localhost:5174";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DEFAULT_TENANT_SLUG = "dsgnfi";
process.env.DEFAULT_SITE_SLUG = "main";
process.env.ALLOW_DEV_SITE_QUERY_OVERRIDE = "true";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.OPENAI_API_KEY = "";
process.env.OPENAI_MODEL = "";

const openAiMocks = vi.hoisted(() => ({
  constructor: vi.fn(),
  responsesCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation((options) => {
    openAiMocks.constructor(options);
    return {
      responses: {
        create: openAiMocks.responsesCreate,
      },
    };
  }),
}));

const mockPrisma = {
  membership: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  site: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  siteDomain: {
    findFirst: vi.fn(),
  },
};

vi.mock("../src/db/prisma", () => ({
  prisma: mockPrisma,
}));

async function createTestApp() {
  const module = await import("../src/app");
  return module.createApp();
}

async function createAdminCookie() {
  const { signToken } = await import("../src/auth/jwt");
  const token = signToken({ id: "admin-1", email: "admin@example.com" });
  return `cms_token=${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "";
  process.env.OPENAI_MODEL = "";

  mockPrisma.membership.findMany.mockResolvedValue([
    {
      userId: "admin-1",
      tenantId: "tenant-1",
      role: "OWNER",
      tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
    },
  ]);
  mockPrisma.membership.findFirst.mockResolvedValue({
    userId: "admin-1",
    tenantId: "tenant-1",
    role: "OWNER",
  });
  mockPrisma.site.findFirst.mockResolvedValue({
    id: "site-1",
    tenantId: "tenant-1",
    slug: "main",
    status: "ACTIVE",
    isDefault: true,
    tenant: { id: "tenant-1", slug: "dsgnfi", name: "Dsgnfi" },
  });
  mockPrisma.site.findUnique.mockResolvedValue(null);
  mockPrisma.siteDomain.findFirst.mockResolvedValue(null);
  openAiMocks.responsesCreate.mockResolvedValue({
    output_text: JSON.stringify({
      intro: "You're on Page Editor.",
      steps: ["Open Pages.", "Choose the page.", "Save the draft, then publish."],
      note: "This assistant can guide you, but it does not publish for you.",
      links: [{ label: "Open Pages", href: "/admin/pages" }],
    }),
  });
});

describe("admin AI guide chat", () => {
  it("requires admin authentication", async () => {
    const app = await createTestApp();

    const response = await request(app).post("/admin/ai/chat").send({
      messages: [{ role: "user", content: "How do I publish?" }],
      context: { route: "/admin/pages", screenTitle: "Pages" },
    });

    expect(response.status).toBe(401);
    expect(openAiMocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("returns validation errors for invalid requests", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [],
        context: { route: "", screenTitle: "" },
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("validation_failed");
    expect(response.body.error.fieldErrors.messages).toBeTruthy();
    expect(response.body.error.fieldErrors.context).toBeTruthy();
    expect(openAiMocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("returns 503 when OpenAI is not configured", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I publish?" }],
        context: { route: "/admin/pages", screenTitle: "Pages" },
      });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("openai_not_configured");
    expect(openAiMocks.responsesCreate).not.toHaveBeenCalled();
  });

  it("creates a read-only OpenAI response with admin context", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I publish this page?" }],
        context: {
          route: "/admin/pages/about",
          screenTitle: "Page Editor",
          tenantName: "Dsgnfi",
          siteName: "Main Site",
          role: "OWNER",
          pageEditor: {
            pageKey: "about",
            title: "About",
            slug: "/about",
            pageTemplateKey: "standard-page",
            allowedBlockTypes: ["hero", "richText"],
            blockTypes: ["hero", "richText"],
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      message: {
        role: "assistant",
        content: "You're on Page Editor. 1. Open Pages. 2. Choose the page. 3. Save the draft, then publish. Note: This assistant can guide you, but it does not publish for you.",
        guide: {
          intro: "You're on Page Editor.",
          steps: ["Open Pages.", "Choose the page.", "Save the draft, then publish."],
          note: "This assistant can guide you, but it does not publish for you.",
          links: [{ label: "Open Pages", href: "/admin/pages" }],
        },
      },
    });
    expect(openAiMocks.constructor).toHaveBeenCalledWith({ apiKey: "test-openai-key" });
    expect(openAiMocks.responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-mini",
        store: false,
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            name: "admin_guide_response",
          }),
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "How do I publish this page?",
              },
            ],
          },
        ],
      })
    );

    const requestPayload = openAiMocks.responsesCreate.mock.calls[0]?.[0];
    expect(requestPayload.instructions).toContain("You are read-only");
    expect(requestPayload.instructions).toContain("Route: /admin/pages/about");
    expect(requestPayload.instructions).toContain("Current block types: hero, richText");
  });

  it("passes image and document attachments into the latest user message", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
    const app = await createTestApp();

    const response = await request(app)
      .post("/admin/ai/chat")
      .set("Cookie", await createAdminCookie())
      .send({
        messages: [{ role: "user", content: "How do I use these files?" }],
        context: { route: "/admin/site-settings", screenTitle: "Site Settings" },
        attachments: [
          {
            name: "layout.png",
            mimeType: "image/png",
            kind: "image",
            dataUrl: "data:image/png;base64,ZmFrZQ==",
          },
          {
            name: "brief.pdf",
            mimeType: "application/pdf",
            kind: "document",
            dataUrl: "data:application/pdf;base64,cGRm",
          },
        ],
      });

    expect(response.status).toBe(200);

    const requestPayload = openAiMocks.responsesCreate.mock.calls.at(-1)?.[0];
    expect(requestPayload.input).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "How do I use these files?",
          },
          {
            type: "input_image",
            detail: "auto",
            image_url: "data:image/png;base64,ZmFrZQ==",
          },
          {
            type: "input_file",
            detail: "high",
            file_data: "cGRm",
            filename: "brief.pdf",
          },
        ],
      },
    ]);
    expect(requestPayload.instructions).toContain("image: layout.png (image/png)");
    expect(requestPayload.instructions).toContain("document: brief.pdf (application/pdf)");
  });
});
