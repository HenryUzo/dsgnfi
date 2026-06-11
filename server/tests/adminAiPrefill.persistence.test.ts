import fs from "fs/promises";
import os from "os";
import path from "path";

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN = "http://localhost:5174";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.UPLOADS_DIR = path.join(os.tmpdir(), "dsgnfi-prefill-tests");

const {
  getTemporaryPrefillArtifacts,
  recordPrefillApplication,
  recordPrefillRejection,
  storeTemporaryPrefillArtifacts,
} = await import("../src/services/adminAiPrefill");

function dataUrl(text: string) {
  return `data:text/plain;base64,${Buffer.from(text, "utf8").toString("base64")}`;
}

function createPrismaMock() {
  const runs: Array<Record<string, any>> = [];
  const artifacts: Array<Record<string, any>> = [];
  const suggestions: Array<Record<string, any>> = [];
  const applications: Array<Record<string, any>> = [];

  const prisma = {
    aiPrefillRun: {
      create: vi.fn(async ({ data }) => {
        const run = { id: "run-1", ...data, createdAt: new Date(), updatedAt: new Date() };
        runs.push(run);
        return run;
      }),
      findFirst: vi.fn(async ({ where }) =>
        runs.find((run) => run.id === where.id && run.adminId === where.adminId && run.siteId === where.siteId && run.pageKey === where.pageKey) ?? null
      ),
      update: vi.fn(async ({ where, data }) => {
        const run = runs.find((entry) => entry.id === where.id);
        Object.assign(run ?? {}, data);
        return run;
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    aiPrefillArtifact: {
      create: vi.fn(async ({ data }) => {
        const artifact = { ...data, createdAt: new Date() };
        artifacts.push(artifact);
        return artifact;
      }),
      findMany: vi.fn(async ({ where }) =>
        artifacts.filter((artifact) => {
          if (where.id?.in && !where.id.in.includes(artifact.id)) return false;
          if (where.adminId && artifact.adminId !== where.adminId) return false;
          if (where.tenantId && artifact.tenantId !== where.tenantId) return false;
          if (where.siteId && artifact.siteId !== where.siteId) return false;
          if (where.pageKey && artifact.pageKey !== where.pageKey) return false;
          if (where.status && artifact.status !== where.status) return false;
          if (where.expiresAt?.lte && !(artifact.expiresAt <= where.expiresAt.lte)) return false;
          if (where.expiresAt?.gt && !(artifact.expiresAt > where.expiresAt.gt)) return false;
          return true;
        })
      ),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    aiPrefillSuggestion: {
      updateMany: vi.fn(async ({ where, data }) => {
        suggestions
          .filter((suggestion) => suggestion.runId === where.runId)
          .forEach((suggestion) => Object.assign(suggestion, data));
        return { count: suggestions.length };
      }),
    },
    aiSuggestionApplication: {
      create: vi.fn(async ({ data }) => {
        applications.push(data);
        return { id: `application-${applications.length}`, ...data };
      }),
    },
    $transaction: vi.fn(async (callback) => callback(prisma)),
    __runs: runs,
    __artifacts: artifacts,
    __applications: applications,
  };

  return prisma;
}

beforeEach(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
  await fs.rm(`${process.env.UPLOADS_DIR!}-private`, { recursive: true, force: true });
});

describe("AI prefill persistence service", () => {
  it("persists uploaded artifact metadata and reloads artifacts from local storage", async () => {
    const prisma = createPrismaMock();

    const result = await storeTemporaryPrefillArtifacts({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageId: "page-1",
      pageKey: "home",
      files: [{ name: "brief.txt", mimeType: "text/plain", dataUrl: dataUrl("Brand brief text") }],
    });

    expect(result.type).toBe("success");
    if (result.type !== "success") return;
    expect(result.runId).toBe("run-1");
    expect(result.artifacts[0]?.hasExtractedText).toBe(true);
    expect(prisma.__artifacts[0]?.storageKey).toContain("tenants/tenant-1/sites/site-1/ai-prefill/run-1/");
    expect(prisma.__artifacts[0]?.visibility).toBe("private");
    expect(prisma.__artifacts[0]?.storageProvider).toBe("local");

    const artifacts = await getTemporaryPrefillArtifacts({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageKey: "home",
      artifactIds: [result.artifacts[0]!.id],
    });

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.dataUrl).toContain("data:text/plain;base64,");
    expect(artifacts[0]?.extractedText).toContain("Brand brief text");
  });

  it("records applied and rejected prefill outcomes with site scoping", async () => {
    const prisma = createPrismaMock();
    prisma.__runs.push({
      id: "run-1",
      adminId: "admin-1",
      siteId: "site-1",
      pageKey: "home",
    });

    const applied = await recordPrefillApplication({
      prisma: prisma as any,
      adminId: "admin-1",
      siteId: "site-1",
      pageId: "page-1",
      pageKey: "home",
      runId: "run-1",
      selectedMetadata: ["seoTitle"],
      selectedSuggestionIds: ["suggestion-1"],
      appliedPatch: { selectedSuggestionKeys: ["hero::0"] },
    });

    expect(applied.type).toBe("success");
    expect(prisma.__applications[0]).toMatchObject({ action: "APPLIED", runId: "run-1" });

    const unauthorized = await recordPrefillRejection({
      prisma: prisma as any,
      adminId: "admin-1",
      siteId: "other-site",
      pageId: "page-1",
      pageKey: "home",
      runId: "run-1",
    });

    expect(unauthorized.type).toBe("not_found");
  });
});
