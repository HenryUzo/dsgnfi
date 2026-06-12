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
  deletePrefillRunArtifactsNow,
  getLatestPagePrefillReview,
  getPagePrefillReviewByRun,
  getTemporaryPrefillArtifacts,
  persistPagePrefillSuggestions,
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
      findFirst: vi.fn(async ({ where, include, orderBy, select }) => {
        const matched = runs.filter((run) => {
          if (where.id && run.id !== where.id) return false;
          if (where.adminId && run.adminId !== where.adminId) return false;
          if (where.tenantId && run.tenantId !== where.tenantId) return false;
          if (where.siteId && run.siteId !== where.siteId) return false;
          if (where.pageKey && run.pageKey !== where.pageKey) return false;
          if (where.status) {
            if (typeof where.status === "string" && run.status !== where.status) return false;
            if (where.status.in && !where.status.in.includes(run.status)) return false;
          }
          return true;
        });
        const sorted = [...matched].sort((left, right) => {
          if (orderBy?.[0]?.generatedAt === "desc") {
            const leftGenerated = left.generatedAt ? new Date(left.generatedAt).getTime() : 0;
            const rightGenerated = right.generatedAt ? new Date(right.generatedAt).getTime() : 0;
            if (rightGenerated !== leftGenerated) return rightGenerated - leftGenerated;
          }
          const leftCreated = new Date(left.createdAt).getTime();
          const rightCreated = new Date(right.createdAt).getTime();
          return rightCreated - leftCreated;
        });
        const run = sorted[0] ?? null;
        if (!run) return null;
        if (select?.id) {
          return { id: run.id };
        }
        if (include) {
          return {
            ...run,
            artifacts: artifacts.filter((artifact) => {
              if (artifact.runId !== run.id) return false;
              if (include.artifacts?.where?.status && artifact.status !== include.artifacts.where.status) return false;
              return true;
            }),
            suggestions: suggestions.filter((suggestion) => suggestion.runId === run.id),
          };
        }
        return run;
      }),
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
          if (where.OR) {
            const orMatched = where.OR.some((entry: Record<string, any>) => {
              if (entry.retainedUntil?.lte) {
                return artifact.retainedUntil && artifact.retainedUntil <= entry.retainedUntil.lte;
              }
              if (entry.retainedUntil === null && entry.expiresAt?.lte) {
                return artifact.retainedUntil === null && artifact.expiresAt <= entry.expiresAt.lte;
              }
              return false;
            });
            if (!orMatched) return false;
          }
          return true;
        })
      ),
      updateMany: vi.fn(async ({ where, data }) => {
        const matched = artifacts.filter((artifact) => {
          if (where.id?.in && !where.id.in.includes(artifact.id)) return false;
          return true;
        });
        matched.forEach((artifact) => Object.assign(artifact, data));
        return { count: matched.length };
      }),
    },
    aiPrefillSuggestion: {
      create: vi.fn(async ({ data }) => {
        const suggestion = {
          id: `suggestion-${suggestions.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        suggestions.push(suggestion);
        return suggestion;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const remaining = suggestions.filter((suggestion) => suggestion.runId !== where.runId);
        suggestions.splice(0, suggestions.length, ...remaining);
        return { count: 0 };
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        suggestions
          .filter((suggestion) => {
            if (suggestion.runId !== where.runId) return false;
            if (where.id?.in && !where.id.in.includes(suggestion.id)) return false;
            return true;
          })
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
    __suggestions: suggestions,
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
    expect(result.artifacts[0]?.status).toBe("ACTIVE");
    expect(result.artifacts[0]?.retainedUntil).toBeTruthy();
    expect(prisma.__artifacts[0]?.storageKey).toContain("tenants/tenant-1/sites/site-1/ai-prefill/run-1/");
    expect(prisma.__artifacts[0]?.visibility).toBe("private");
    expect(prisma.__artifacts[0]?.storageProvider).toBe("local");
    expect(prisma.__artifacts[0]?.retainedUntil.getTime() - prisma.__artifacts[0]?.createdAt.getTime()).toBeGreaterThan(
      29 * 24 * 60 * 60 * 1000
    );

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

  it("persists generated suggestions for later review and scopes retrieval by tenant/site/admin", async () => {
    const prisma = createPrismaMock();

    const upload = await storeTemporaryPrefillArtifacts({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageId: "page-1",
      pageKey: "home",
      files: [{ name: "brief.txt", mimeType: "text/plain", dataUrl: dataUrl("Brand brief text") }],
    });

    expect(upload.type).toBe("success");
    if (upload.type !== "success") return;

    const persisted = await persistPagePrefillSuggestions({
      prisma: prisma as any,
      runId: upload.runId,
      pageId: "page-1",
      suggestions: {
        analysis: {
          brandName: "DSGNFI Studio",
          positioning: "Clearer brands and better websites.",
          audience: ["SMEs"],
          services: ["Brand Design"],
          tone: "clear",
          notes: ["Mapped to homepage hero."],
        },
        page: {
          seoTitle: "DSGNFI Studio | Clearer brands",
          seoDescription: "Strategy-led creative services.",
        },
        blocks: [
          {
            blockId: "hero",
            blockType: "blitHeroCollage",
            label: "Hero",
            summary: "Hero rewrite",
            dataPatch: { headline: "Clearer brands and better websites." },
            confidence: 0.92,
            notes: null,
          },
        ],
      },
    });

    expect(persisted.blocks[0]?.id).toBeTruthy();

    const latest = await getLatestPagePrefillReview({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageKey: "home",
    });

    expect(latest?.runId).toBe(upload.runId);
    expect(latest?.artifacts[0]?.status).toBe("ACTIVE");
    expect(latest?.blocks[0]?.dataPatch).toMatchObject({ headline: "Clearer brands and better websites." });

    const wrongSite = await getPagePrefillReviewByRun({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "other-site",
      pageKey: "home",
      runId: upload.runId,
    });

    expect(wrongSite).toBeNull();
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

  it("deletes retained raw briefs immediately without removing persisted suggestions", async () => {
    const prisma = createPrismaMock();

    const upload = await storeTemporaryPrefillArtifacts({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageId: "page-1",
      pageKey: "home",
      files: [{ name: "brief.txt", mimeType: "text/plain", dataUrl: dataUrl("Brand brief text") }],
    });

    expect(upload.type).toBe("success");
    if (upload.type !== "success") return;

    await persistPagePrefillSuggestions({
      prisma: prisma as any,
      runId: upload.runId,
      pageId: "page-1",
      suggestions: {
        analysis: null,
        page: {},
        blocks: [
          {
            blockId: "hero",
            blockType: "blitHeroCollage",
            label: "Hero",
            summary: "Hero rewrite",
            dataPatch: { headline: "Clearer brands and better websites." },
            confidence: 0.92,
            notes: null,
          },
        ],
      },
    });

    const deleted = await deletePrefillRunArtifactsNow({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "site-1",
      pageKey: "home",
      runId: upload.runId,
    });

    expect(deleted.type).toBe("success");
    if (deleted.type !== "success") return;
    expect(deleted.deletedCount).toBe(1);
    expect(deleted.review?.artifacts?.[0]?.status).toBe("DELETED");
    expect(prisma.__artifacts[0]?.status).toBe("DELETED");
    expect(prisma.__artifacts[0]?.extractedText).toBeNull();
    expect(deleted.review?.blocks).toHaveLength(1);

    const unauthorized = await deletePrefillRunArtifactsNow({
      prisma: prisma as any,
      adminId: "admin-1",
      tenantId: "tenant-1",
      siteId: "other-site",
      pageKey: "home",
      runId: upload.runId,
    });

    expect(unauthorized.type).toBe("not_found");
  });
});
