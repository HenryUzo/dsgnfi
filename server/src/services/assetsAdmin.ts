import fs from "fs/promises";
import path from "path";

import type { PrismaClient } from "@prisma/client";

import { getUploadsDir } from "./uploadStorage";

type AssetRecord = {
  id: string;
  siteId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  altText: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toAssetResponse(asset: AssetRecord) {
  return {
    id: asset.id,
    url: asset.url,
    filename: asset.filename,
    mimeType: asset.mimeType,
    size: asset.size,
    altText: asset.altText,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

function getFilenameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return path.basename(parsed.pathname);
  } catch {
    return path.basename(url);
  }
}

export async function listAdminAssets(prisma: PrismaClient, siteId: string) {
  const assets = await prisma.asset.findMany({
    where: { siteId },
    orderBy: [{ createdAt: "desc" }, { filename: "asc" }],
  });

  return assets.map(toAssetResponse);
}

export async function createAdminAsset(
  prisma: PrismaClient,
  options: {
    siteId: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    altText?: string | null;
  }
) {
  const asset = await prisma.asset.create({
    data: {
      siteId: options.siteId,
      url: options.url,
      filename: options.filename,
      mimeType: options.mimeType,
      size: options.size,
      altText: options.altText ?? null,
    },
  });

  return toAssetResponse(asset);
}

export async function updateAdminAsset(
  prisma: PrismaClient,
  options: {
    siteId: string;
    assetId: string;
    filename?: string | null;
    altText?: string | null;
  }
) {
  const existing = await prisma.asset.findFirst({
    where: {
      id: options.assetId,
      siteId: options.siteId,
    },
  });

  if (!existing) {
    return null;
  }

  const asset = await prisma.asset.update({
    where: { id: options.assetId },
    data: {
      filename: options.filename ?? existing.filename,
      altText: options.altText ?? null,
    },
  });

  return toAssetResponse(asset);
}

export async function deleteAdminAsset(
  prisma: PrismaClient,
  options: {
    siteId: string;
    assetId: string;
  }
) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: options.assetId,
      siteId: options.siteId,
    },
  });

  if (!asset) {
    return false;
  }

  await prisma.$transaction([
    prisma.siteSettings.updateMany({
      where: {
        siteId: options.siteId,
        OR: [{ logoUrl: asset.url }, { faviconUrl: asset.url }],
      },
      data: {
        logoUrl: null,
        faviconUrl: null,
      },
    }),
    prisma.asset.delete({
      where: { id: asset.id },
    }),
  ]);

  const filePath = path.resolve(getUploadsDir(), getFilenameFromUrl(asset.url));
  await fs.unlink(filePath).catch(() => undefined);

  return true;
}
