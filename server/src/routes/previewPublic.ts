import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { getPreviewCmsSection } from "../services/cmsPublicCompatibility";
import { getPreviewPageDraft } from "../services/pagePreview";
import { validatePreviewToken } from "../services/previewTokens";
import { getSitePresentation, toPublicSiteResponse } from "../services/sitePresentation";

const router = Router();

const paramsSchema = z.object({
  pageKey: z.string().min(1),
});

const querySchema = z.object({
  token: z.string().min(1),
});

const cmsQuerySchema = z.object({
  token: z.string().min(1),
  page: z.string().min(1),
  section: z.string().min(1),
});

router.get("/pages/:pageKey", async (req, res) => {
  // This is the token-gated preview API route. The browser-facing preview URL
  // is /preview/pages/:pageKey and should fetch draft data only through this endpoint.
  const parsedParams = paramsSchema.safeParse(req.params);
  const parsedQuery = querySchema.safeParse(req.query);

  if (!parsedParams.success || !parsedQuery.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Preview token and page key are required." },
    });
  }

  const validation = await validatePreviewToken(prisma, {
    rawToken: parsedQuery.data.token,
    pageKey: parsedParams.data.pageKey,
  });

  if (validation.type !== "valid") {
    return res.status(403).json({
      ok: false,
      error: { message: "Preview token is invalid or expired." },
    });
  }

  const page = await getPreviewPageDraft(prisma, {
    siteId: validation.token.siteId,
    pageKey: parsedParams.data.pageKey,
  });
  const presentation = await getSitePresentation(prisma, validation.token.siteId);

  if (!page) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  const presentationPayload = toPublicSiteResponse(presentation);
  const nextPresentation =
    presentationPayload && !presentationPayload.pages.some((entry) => entry.pageKey === page.pageKey)
      ? {
          ...presentationPayload,
          pages: [
            ...presentationPayload.pages,
            {
              pageKey: page.pageKey,
              title: page.title,
              slug: page.slug,
              hierarchy: page.hierarchy,
            },
          ],
        }
      : presentationPayload;

  return res.json({
    ok: true,
    presentation: nextPresentation,
    page,
    preview: {
      tokenId: validation.token.id,
      pageKey: validation.token.pageKey,
      expiresAt: validation.token.expiresAt,
    },
  });
});

router.get("/cms/section", async (req, res) => {
  const parsed = cmsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { message: "Preview token, page, and section are required." },
    });
  }

  const validation = await validatePreviewToken(prisma, {
    rawToken: parsed.data.token,
    pageKey: parsed.data.page,
  });

  if (validation.type !== "valid") {
    return res.status(403).json({
      ok: false,
      error: { message: "Preview token is invalid or expired." },
    });
  }

  const data = await getPreviewCmsSection(prisma, {
    siteId: validation.token.siteId,
    page: parsed.data.page,
    section: parsed.data.section,
  });

  return res.json({
    ok: true,
    page: parsed.data.page,
    section: parsed.data.section,
    data,
  });
});

export default router;
