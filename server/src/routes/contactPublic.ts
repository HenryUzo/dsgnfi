import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { withPublicSiteContext } from "../middleware/withPublicSiteContext";

const router = Router();

const contactSubmissionSchema = z.object({
  firstName: z.string().trim().max(120).optional().default(""),
  lastName: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(254),
  company: z.string().trim().min(1, "Company is required.").max(180),
  jobTitle: z.string().trim().max(180).optional().default(""),
  message: z.string().trim().min(1, "Message is required.").max(5000),
  website: z.string().trim().max(200).optional().default(""),
  pagePath: z.string().trim().max(2048).optional().default(""),
});

router.use(withPublicSiteContext);

router.post("/", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const siteId = req.context?.siteId;
  if (!siteId) {
    return res.status(500).json({
      ok: false,
      error: { message: "Missing public site context." },
    });
  }

  const parsed = contactSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "validation_failed",
        message: "Invalid contact submission.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const submission = parsed.data;
  if (submission.website) {
    return res.json({ ok: true });
  }

  await prisma.contactSubmission.create({
    data: {
      siteId,
      firstName: submission.firstName || null,
      lastName: submission.lastName || null,
      email: submission.email,
      company: submission.company,
      jobTitle: submission.jobTitle || null,
      message: submission.message,
      pagePath: submission.pagePath || null,
      userAgent: (req.get("user-agent") ?? "").slice(0, 512) || null,
    },
  });

  return res.json({ ok: true });
});

export default router;
