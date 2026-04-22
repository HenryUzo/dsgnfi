import crypto from "crypto";

import type { CmsSection, Page, PageRevision, Prisma, PrismaClient } from "@prisma/client";

import {
  validateProcessCompatibilityContent,
  type ProcessCompatibilityContent,
} from "./pageValidation";
import { writeAuditLog } from "./auditLog";

const PROCESS_PAGE_KEY = "process";
const PROCESS_SECTION_KEY = "content";
const PROCESS_SLUG = "/process";
const PROCESS_TITLE = "Process";

type ProcessPageRecord = Page & {
  currentDraftRevision: PageRevision | null;
  currentPublishedRevision: PageRevision | null;
};

function createBlock<TType extends ProcessCompatibilityContent["blocks"][number]["type"]>(
  type: TType,
  data: unknown,
  variant?: string
) : ProcessCompatibilityContent["blocks"][number] {
  return {
    id: crypto.randomUUID(),
    type,
    variant,
    data,
  } as ProcessCompatibilityContent["blocks"][number];
}

export const defaultProcessContent: ProcessCompatibilityContent = {
  blocks: [
    createBlock("processHeroAtticSalt", {
      title: "Don't be the side show,\nwhen you can be the star.",
      collageImageUrl: "",
      collageAlt: "Process collage",
    }),
    createBlock("processMethodIntro", {
      kicker: "OUR APPROACH TO BRAND BUILDING",
      paragraphs: [
        "Method Branding™ is an extremely mindful approach that empowers our teams with the stage to deliver a brand performance that captivates your audiences and makes them demand an encore.",
        "Inspired by method acting, our iACT process ensures we embody the brand before we express it.",
        "It's strategic, psychological, and rigorously human-centered. The result is a brand identity that feels real, not rehearsed.",
      ],
    }),
    createBlock("processStepsAccordion", {
      heading: "The method to our mastery",
      steps: [
        {
          number: "01",
          title: "Immerse",
          description:
            "An unfiltered dive into the user and your organization to unlock key insights and define what truly makes your brand one-of-a-kind.",
          deliverables: ["Research synthesis", "Insight report"],
        },
        {
          number: "02",
          title: "Articulate",
          description:
            "Learning how your brand connects, clarifying your unique position and surfacing a clear messaging system aligned to your story.",
          deliverables: ["Messaging", "Positioning"],
        },
        {
          number: "03",
          title: "Create",
          description:
            "We then translate your powerful story into visually compelling work designed to communicate your brand with clarity and impact.",
          deliverables: ["Identity system", "Core assets"],
        },
        {
          number: "04",
          title: "Transform",
          description:
            "From product to brand launch, we'll be your side by side collaborators to bring visibility, clarity, and momentum.",
          deliverables: ["Launch plan", "Activation assets"],
        },
      ],
    }),
    createBlock("processMediaPeekCarousel", {
      heading: "Introducing Brand Seasoning®",
      description:
        "We invented Brand Seasoning to amplify the brands behind everyday experiences. From workbooks, ecosystems, and digital frameworks to memorable touchpoints designed to keep your craft fresh and recognizable.",
      slides: [
        { title: "Brand Framework", mainImageUrl: "", peekImageUrl: "" },
        { title: "Next Slide", mainImageUrl: "", peekImageUrl: "" },
      ],
      showCounter: true,
    }),
    createBlock("processCtaOutline", {
      title: "Ready to start\na project?",
      linkLabel: "LET'S CHAT",
      href: "/contact",
    }),
  ],
};

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function checksumForContent(content: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function hasNonEmptyBlocks(content: unknown) {
  return (
    typeof content === "object" &&
    content !== null &&
    Array.isArray((content as { blocks?: unknown }).blocks) &&
    (content as { blocks: unknown[] }).blocks.length > 0
  );
}

async function getNextRevisionNumber(prisma: PrismaClient, pageId: string) {
  const latestRevision = await prisma.pageRevision.findFirst({
    where: { pageId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true },
  });

  return (latestRevision?.revisionNumber ?? 0) + 1;
}

async function getProcessPage(prisma: PrismaClient, siteId: string) {
  return prisma.page.findUnique({
    where: {
      siteId_pageKey: {
        siteId,
        pageKey: PROCESS_PAGE_KEY,
      },
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });
}

async function ensureProcessPage(
  prisma: PrismaClient,
  options: { siteId: string }
) {
  const existing = await getProcessPage(prisma, options.siteId);
  if (existing) {
    return existing;
  }

  const page = await prisma.page.create({
    data: {
      siteId: options.siteId,
      pageKey: PROCESS_PAGE_KEY,
      slug: PROCESS_SLUG,
      title: PROCESS_TITLE,
      status: "DRAFT",
      seoTitle: PROCESS_TITLE,
      seoDescription: "Process page",
    },
  });

  return {
    ...page,
    currentDraftRevision: null,
    currentPublishedRevision: null,
  } satisfies ProcessPageRecord;
}

async function createDraftRevision(
  prisma: PrismaClient,
  options: {
    page: ProcessPageRecord;
    adminId: string | null;
    content: ProcessCompatibilityContent;
  }
) {
  const nextRevisionNumber = await getNextRevisionNumber(prisma, options.page.id);
  const revision = await prisma.pageRevision.create({
    data: {
      pageId: options.page.id,
      revisionNumber: nextRevisionNumber,
      state: "DRAFT",
      content: toJsonInput(options.content),
      schemaVersion: 1,
      checksum: checksumForContent(options.content),
      createdBy: options.adminId,
    },
  });

  return prisma.page.update({
    where: { id: options.page.id },
    data: {
      currentDraftRevisionId: revision.id,
      status: options.page.currentPublishedRevisionId ? options.page.status : "DRAFT",
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });
}

async function createPublishedRevision(
  prisma: PrismaClient,
  options: {
    page: ProcessPageRecord;
    adminId: string | null;
    content: ProcessCompatibilityContent;
    publishedAt?: Date | null;
  }
) {
  const nextRevisionNumber = await getNextRevisionNumber(prisma, options.page.id);
  const publishedAt = options.publishedAt ?? new Date();
  const revision = await prisma.pageRevision.create({
    data: {
      pageId: options.page.id,
      revisionNumber: nextRevisionNumber,
      state: "PUBLISHED",
      content: toJsonInput(options.content),
      schemaVersion: 1,
      checksum: checksumForContent(options.content),
      createdBy: options.adminId,
      publishedBy: options.adminId,
      publishedAt,
    },
  });

  return prisma.page.update({
    where: { id: options.page.id },
    data: {
      currentPublishedRevisionId: revision.id,
      status: "PUBLISHED",
    },
    include: {
      currentDraftRevision: true,
      currentPublishedRevision: true,
    },
  });
}

function toRoutePayload(page: ProcessPageRecord) {
  return {
    ok: true as const,
    data:
      (page.currentDraftRevision?.content as ProcessCompatibilityContent | null) ??
      defaultProcessContent,
    status: page.status,
    publishedAt: page.currentPublishedRevision?.publishedAt ?? null,
  };
}

async function getLegacyProcessSection(prisma: PrismaClient, siteId: string) {
  return prisma.cmsSection.findUnique({
    where: {
      siteId_page_section: {
        siteId,
        page: PROCESS_PAGE_KEY,
        section: PROCESS_SECTION_KEY,
      },
    },
  });
}

async function bridgeLegacyPublishedIfNeeded(
  prisma: PrismaClient,
  page: ProcessPageRecord,
  legacy: CmsSection | null
) {
  if (!legacy || legacy.status !== "PUBLISHED" || page.currentPublishedRevision) {
    return page;
  }

  const parsed = validateProcessCompatibilityContent(legacy.publishedData);
  if (!parsed.success || !hasNonEmptyBlocks(parsed.data)) {
    return page;
  }

  return createPublishedRevision(prisma, {
    page,
    adminId: null,
    content: parsed.data,
    publishedAt: legacy.publishedAt,
  });
}

export async function getProcessDraftForAdmin(
  prisma: PrismaClient,
  options: { siteId: string; adminId: string | null }
) {
  let page = await ensureProcessPage(prisma, { siteId: options.siteId });
  const legacy = await getLegacyProcessSection(prisma, options.siteId);

  page = await bridgeLegacyPublishedIfNeeded(prisma, page, legacy);

  if (hasNonEmptyBlocks(page.currentDraftRevision?.content)) {
    return toRoutePayload(page);
  }

  if (legacy) {
    const parsedLegacyDraft = validateProcessCompatibilityContent(legacy.draftData);
    if (parsedLegacyDraft.success && hasNonEmptyBlocks(parsedLegacyDraft.data)) {
      page = await createDraftRevision(prisma, {
        page,
        adminId: options.adminId,
        content: parsedLegacyDraft.data,
      });
      return toRoutePayload(page);
    }
  }

  page = await createDraftRevision(prisma, {
    page,
    adminId: options.adminId,
    content: defaultProcessContent,
  });

  return toRoutePayload(page);
}

export async function saveProcessDraftForAdmin(
  prisma: PrismaClient,
  options: { siteId: string; adminId: string | null; payload: unknown }
) {
  const validation = validateProcessCompatibilityContent(options.payload);
  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  const page = await ensureProcessPage(prisma, { siteId: options.siteId });
  const updatedPage = await createDraftRevision(prisma, {
    page,
    adminId: options.adminId,
    content: validation.data,
  });

  return {
    type: "success" as const,
    page: toRoutePayload(updatedPage),
  };
}

export async function publishProcessForAdmin(
  prisma: PrismaClient,
  options: { siteId: string; adminId: string | null }
) {
  let page = await ensureProcessPage(prisma, { siteId: options.siteId });

  if (!hasNonEmptyBlocks(page.currentDraftRevision?.content)) {
    await getProcessDraftForAdmin(prisma, options);
    page = (await getProcessPage(prisma, options.siteId)) ?? page;
  }

  const validation = validateProcessCompatibilityContent(page.currentDraftRevision?.content);
  if (!validation.success) {
    return { type: "validation_error" as const, error: validation.error };
  }

  page = await createPublishedRevision(prisma, {
    page,
    adminId: options.adminId,
    content: validation.data,
  });

  await writeAuditLog(prisma, {
    actorAdminUserId: options.adminId,
    siteId: options.siteId,
    action: "page.published",
    entityType: "page",
    entityId: page.id,
    metadata: {
      pageKey: PROCESS_PAGE_KEY,
      publishedRevisionId: page.currentPublishedRevisionId,
    },
  });

  return {
    type: "success" as const,
    data:
      (page.currentPublishedRevision?.content as ProcessCompatibilityContent | null) ??
      validation.data,
  };
}

export async function getPublishedProcessForPublic(
  prisma: PrismaClient,
  options: { siteId: string }
) {
  const page = await getProcessPage(prisma, options.siteId);
  if (page?.currentPublishedRevision && hasNonEmptyBlocks(page.currentPublishedRevision.content)) {
    return page.currentPublishedRevision.content as ProcessCompatibilityContent;
  }

  const legacy = await getLegacyProcessSection(prisma, options.siteId);
  if (legacy?.status === "PUBLISHED") {
    const parsedLegacy = validateProcessCompatibilityContent(legacy.publishedData);
    if (parsedLegacy.success && hasNonEmptyBlocks(parsedLegacy.data)) {
      return parsedLegacy.data;
    }
  }

  return null;
}
