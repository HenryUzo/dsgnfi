import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { env } from "../../config/env";
import { getUploadsDir } from "../uploadStorage";
import { buildStorageKey } from "./storageKeys";
import type { StorageObjectMetadata, StorageProvider, StoragePutInput, StorageVisibility } from "./types";

function normalizePublicBaseUrl(value: string | undefined) {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function privateRootFromPublicRoot(publicRoot: string) {
  return `${publicRoot.replace(/[\\/]$/, "")}-private`;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;
  readonly publicRoot: string;
  readonly privateRoot: string;
  readonly publicBaseUrl: string;

  constructor(options?: { publicRoot?: string; privateRoot?: string; publicBaseUrl?: string }) {
    this.publicRoot = path.resolve(options?.publicRoot ?? env.STORAGE_LOCAL_PUBLIC_DIR ?? getUploadsDir());
    this.privateRoot = path.resolve(
      options?.privateRoot ?? env.STORAGE_LOCAL_PRIVATE_DIR ?? privateRootFromPublicRoot(this.publicRoot)
    );
    this.publicBaseUrl = normalizePublicBaseUrl(options?.publicBaseUrl ?? env.STORAGE_PUBLIC_BASE_URL);
  }

  async putObject(input: StoragePutInput): Promise<StorageObjectMetadata> {
    const key = buildStorageKey(input);
    const root = this.rootFor(input.visibility);
    const target = this.resolveKey(root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.body);

    return {
      provider: this.name,
      bucket: null,
      key,
      visibility: input.visibility,
      publicUrl: input.visibility === "public" ? this.getPublicUrl(key) : null,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      checksum: crypto.createHash("sha256").update(input.body).digest("hex"),
    };
  }

  async copyFromLocalPath(input: Omit<StoragePutInput, "body" | "sizeBytes"> & { sourcePath: string }) {
    const bytes = await fs.readFile(input.sourcePath);
    return this.putObject({
      ...input,
      body: bytes,
      sizeBytes: bytes.byteLength,
    });
  }

  async getObjectBytes(key: string, visibility: StorageVisibility) {
    return fs.readFile(this.resolveKey(this.rootFor(visibility), key));
  }

  async deleteObject(key: string, visibility: StorageVisibility) {
    const target = this.resolveKey(this.rootFor(visibility), key);
    await fs.unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }

  async exists(key: string, visibility: StorageVisibility) {
    try {
      await fs.access(this.resolveKey(this.rootFor(visibility), key));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string) {
    const normalizedKey = key.split("/").map(encodeURIComponent).join("/");
    return this.publicBaseUrl ? `${this.publicBaseUrl}/${normalizedKey}` : `/uploads/${normalizedKey}`;
  }

  async getSignedReadUrl(key: string, visibility: StorageVisibility) {
    if (visibility === "public") {
      return this.getPublicUrl(key);
    }
    return null;
  }

  private rootFor(visibility: StorageVisibility) {
    return visibility === "public" ? this.publicRoot : this.privateRoot;
  }

  private resolveKey(root: string, key: string) {
    const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (normalized.includes("../") || normalized.startsWith("..")) {
      throw new Error("Unsafe storage key.");
    }
    const target = path.resolve(root, normalized);
    const resolvedRoot = path.resolve(root);
    const relative = path.relative(resolvedRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Unsafe storage key.");
    }
    return target;
  }
}
