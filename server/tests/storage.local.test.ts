import fs from "fs/promises";
import os from "os";
import path from "path";

import { beforeEach, describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGIN = "http://localhost:5174";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

const { LocalStorageProvider } = await import("../src/services/storage/localStorageProvider");
const { sanitizeFilename } = await import("../src/services/storage/storageKeys");

const root = path.join(os.tmpdir(), "dsgnfi-storage-tests");
const publicRoot = path.join(root, "public");
const privateRoot = path.join(root, "private");

beforeEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("local storage provider", () => {
  it("stores public files under the public root and returns /uploads URLs", async () => {
    const provider = new LocalStorageProvider({ publicRoot, privateRoot });
    const stored = await provider.putObject({
      visibility: "public",
      tenantId: "tenant-1",
      siteId: "site-1",
      category: "asset",
      ownerId: "asset-1",
      filename: "Hero Image.png",
      body: Buffer.from("image-bytes"),
      mimeType: "image/png",
      sizeBytes: 11,
    });

    expect(stored.key).toContain("tenants/tenant-1/sites/site-1/assets/asset-1/hero-image.png");
    expect(stored.publicUrl).toBe(`/uploads/${stored.key}`);
    await expect(fs.readFile(path.join(publicRoot, stored.key), "utf8")).resolves.toBe("image-bytes");
  });

  it("stores private files outside the public root and does not return a public URL", async () => {
    const provider = new LocalStorageProvider({ publicRoot, privateRoot });
    const stored = await provider.putObject({
      visibility: "private",
      tenantId: "tenant-1",
      siteId: "site-1",
      category: "ai-prefill",
      ownerId: "run-1",
      filename: "brief.txt",
      body: Buffer.from("private brief"),
      mimeType: "text/plain",
      sizeBytes: 13,
    });

    expect(stored.publicUrl).toBeNull();
    await expect(fs.readFile(path.join(privateRoot, stored.key), "utf8")).resolves.toBe("private brief");
    await expect(fs.access(path.join(publicRoot, stored.key))).rejects.toThrow();
  });

  it("sanitizes filenames so traversal input cannot become a path", () => {
    expect(sanitizeFilename("../../secret Brief.PDF")).toBe("secret-brief.pdf");
    expect(sanitizeFilename("..\\..\\image.svg")).toBe("image.svg");
  });
});
