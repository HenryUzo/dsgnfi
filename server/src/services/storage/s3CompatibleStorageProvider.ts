import crypto from "crypto";
import fs from "fs/promises";

import { env } from "../../config/env";
import { buildStorageKey } from "./storageKeys";
import type { StorageObjectMetadata, StorageProvider, StoragePutInput, StorageVisibility } from "./types";

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function sha256(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function dateStamp(value: string) {
  return value.slice(0, 8);
}

function signingKey(secret: string, date: string, region: string) {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

export class S3CompatibleStorageProvider implements StorageProvider {
  readonly name = "s3" as const;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;
  private readonly publicBaseUrl: string | undefined;

  constructor() {
    this.bucket = env.STORAGE_BUCKET!;
    this.region = env.STORAGE_REGION!;
    this.endpoint = env.STORAGE_ENDPOINT!.replace(/\/+$/, "");
    this.accessKeyId = env.STORAGE_ACCESS_KEY_ID!;
    this.secretAccessKey = env.STORAGE_SECRET_ACCESS_KEY!;
    this.forcePathStyle = env.STORAGE_FORCE_PATH_STYLE;
    this.publicBaseUrl = env.STORAGE_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  }

  async putObject(input: StoragePutInput): Promise<StorageObjectMetadata> {
    const key = buildStorageKey(input);
    const checksum = sha256(input.body);
    const response = await fetch(this.objectUrl(key), {
      method: "PUT",
      headers: this.signedHeaders("PUT", key, checksum, {
        "content-type": input.mimeType,
        "content-length": String(input.sizeBytes),
      }),
      body: new Uint8Array(input.body),
    });

    if (!response.ok) {
      throw new Error(`S3 putObject failed with ${response.status}.`);
    }

    return {
      provider: this.name,
      bucket: this.bucket,
      key,
      visibility: input.visibility,
      publicUrl: input.visibility === "public" ? this.getPublicUrl(key) : null,
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
      checksum,
    };
  }

  async copyFromLocalPath(input: Omit<StoragePutInput, "body" | "sizeBytes"> & { sourcePath: string }) {
    const bytes = await fs.readFile(input.sourcePath);
    return this.putObject({ ...input, body: bytes, sizeBytes: bytes.byteLength });
  }

  async getObjectBytes(key: string) {
    const response = await fetch(this.objectUrl(key), {
      method: "GET",
      headers: this.signedHeaders("GET", key, "UNSIGNED-PAYLOAD"),
    });
    if (!response.ok) {
      throw new Error(`S3 getObject failed with ${response.status}.`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async deleteObject(key: string) {
    const response = await fetch(this.objectUrl(key), {
      method: "DELETE",
      headers: this.signedHeaders("DELETE", key, sha256("")),
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 deleteObject failed with ${response.status}.`);
    }
  }

  async exists(key: string) {
    const response = await fetch(this.objectUrl(key), {
      method: "HEAD",
      headers: this.signedHeaders("HEAD", key, sha256("")),
    });
    return response.ok;
  }

  getPublicUrl(key: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${encodeKey(key)}`;
    }
    return this.objectUrl(key);
  }

  async getSignedReadUrl(key: string, _visibility: StorageVisibility, expiresInSeconds = 300) {
    const now = amzDate();
    const date = dateStamp(now);
    const credential = `${this.accessKeyId}/${date}/${this.region}/s3/aws4_request`;
    const url = new URL(this.objectUrl(key));
    url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    url.searchParams.set("X-Amz-Credential", credential);
    url.searchParams.set("X-Amz-Date", now);
    url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
    url.searchParams.set("X-Amz-SignedHeaders", "host");

    const canonicalQuery = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([keyName, value]) => `${encodeURIComponent(keyName)}=${encodeURIComponent(value)}`)
      .join("&");
    const canonicalRequest = [
      "GET",
      url.pathname,
      canonicalQuery,
      `host:${url.host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      now,
      `${date}/${this.region}/s3/aws4_request`,
      sha256(canonicalRequest),
    ].join("\n");
    const signature = crypto.createHmac("sha256", signingKey(this.secretAccessKey, date, this.region)).update(stringToSign).digest("hex");
    url.searchParams.set("X-Amz-Signature", signature);
    return url.toString();
  }

  private objectUrl(key: string) {
    const encodedKey = encodeKey(key);
    if (this.forcePathStyle) {
      return `${this.endpoint}/${this.bucket}/${encodedKey}`;
    }
    const endpoint = new URL(this.endpoint);
    return `${endpoint.protocol}//${this.bucket}.${endpoint.host}/${encodedKey}`;
  }

  private signedHeaders(method: string, key: string, payloadHash: string, extra: Record<string, string> = {}) {
    const url = new URL(this.objectUrl(key));
    const now = amzDate();
    const date = dateStamp(now);
    const baseHeaders: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": now,
      ...extra,
    };
    const headerEntries = Object.entries(baseHeaders)
      .map(([header, value]) => [header.toLowerCase(), value.trim()] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    const canonicalHeaders = headerEntries.map(([header, value]) => `${header}:${value}\n`).join("");
    const signedHeaders = headerEntries.map(([header]) => header).join(";");
    const canonicalRequest = [
      method,
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const credentialScope = `${date}/${this.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", now, credentialScope, sha256(canonicalRequest)].join("\n");
    const signature = crypto.createHmac("sha256", signingKey(this.secretAccessKey, date, this.region)).update(stringToSign).digest("hex");

    return {
      ...baseHeaders,
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }
}
