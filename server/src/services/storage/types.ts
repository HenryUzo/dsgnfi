export type StorageVisibility = "public" | "private";
export type StorageCategory = "asset" | "template-import" | "ai-prefill" | "temp";
export type StorageProviderName = "local" | "s3";

export type StorageObjectContext = {
  visibility: StorageVisibility;
  tenantId: string;
  siteId: string;
  category: StorageCategory;
  ownerId: string;
  filename: string;
};

export type StoragePutInput = StorageObjectContext & {
  body: Buffer;
  mimeType: string;
  sizeBytes: number;
};

export type StorageObjectMetadata = {
  provider: StorageProviderName;
  bucket: string | null;
  key: string;
  visibility: StorageVisibility;
  publicUrl: string | null;
  sizeBytes?: number;
  mimeType?: string;
  checksum?: string;
};

export interface StorageProvider {
  readonly name: StorageProviderName;
  putObject(input: StoragePutInput): Promise<StorageObjectMetadata>;
  getObjectBytes(key: string, visibility: StorageVisibility): Promise<Buffer>;
  deleteObject(key: string, visibility: StorageVisibility): Promise<void>;
  exists(key: string, visibility: StorageVisibility): Promise<boolean>;
  getPublicUrl(key: string): string | null;
  getSignedReadUrl(key: string, visibility: StorageVisibility, expiresInSeconds?: number): Promise<string | null>;
  copyFromLocalPath(input: Omit<StoragePutInput, "body" | "sizeBytes"> & { sourcePath: string }): Promise<StorageObjectMetadata>;
}
