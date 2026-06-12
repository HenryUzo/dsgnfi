import { env } from "../../config/env";
import { LocalStorageProvider } from "./localStorageProvider";
import { S3CompatibleStorageProvider } from "./s3CompatibleStorageProvider";
import type { StorageProvider, StoragePutInput, StorageVisibility } from "./types";

let provider: StorageProvider | null = null;

export function getStorageProvider() {
  if (!provider) {
    provider = env.STORAGE_PROVIDER === "s3" ? new S3CompatibleStorageProvider() : new LocalStorageProvider();
  }
  return provider;
}

export function setStorageProviderForTests(nextProvider: StorageProvider | null) {
  provider = nextProvider;
}

export async function putObject(input: StoragePutInput) {
  return getStorageProvider().putObject(input);
}

export async function copyFromLocalPath(input: Parameters<StorageProvider["copyFromLocalPath"]>[0]) {
  return getStorageProvider().copyFromLocalPath(input);
}

export async function getObjectBytes(key: string, visibility: StorageVisibility) {
  return getStorageProvider().getObjectBytes(key, visibility);
}

export async function deleteObject(key: string, visibility: StorageVisibility) {
  return getStorageProvider().deleteObject(key, visibility);
}

export async function getSignedReadUrl(key: string, visibility: StorageVisibility, expiresInSeconds?: number) {
  return getStorageProvider().getSignedReadUrl(key, visibility, expiresInSeconds);
}
