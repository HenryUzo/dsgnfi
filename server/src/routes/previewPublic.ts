import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { getPreviewPageDraft } from "../services/pagePreview";
import { validatePreviewToken } from "../services/previewTokens";

const router = Router();

const paramsSchema = z.object({
  pageKey: z.string().min(1),
});

const querySchema = z.object({
  token: z.string().min(1),
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

  if (!page) {
    return res.status(404).json({
      ok: false,
      error: { message: "Page not found." },
    });
  }

  return res.json({
    ok: true,
    page,
    preview: {
      tokenId: validation.token.id,
      pageKey: validation.token.pageKey,
      expiresAt: validation.token.expiresAt,
    },
  });
});

export default router;
