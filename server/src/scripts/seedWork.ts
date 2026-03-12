import "dotenv/config";

import { prisma } from "../db/prisma";

const seedTagName = process.env.SEED_WORK_TAG_NAME ?? "Branding";
const seedTagSlug = process.env.SEED_WORK_TAG_SLUG ?? "branding";
const seedProjectTitle = process.env.SEED_WORK_PROJECT_TITLE ?? "Sample Work Project";
const seedProjectSlug = process.env.SEED_WORK_PROJECT_SLUG ?? "sample-work-project";
const seedTemplateId = process.env.SEED_WORK_TEMPLATE_ID ?? "classic-case-study";

async function main() {
  await prisma.workPageMeta.upsert({
    where: { key: "work" },
    update: {},
    create: {
      key: "work",
      titleDraft: "Our Work",
      subtitleDraft: "Selected projects and outcomes.",
      titlePublished: "Our Work",
      subtitlePublished: "Selected projects and outcomes.",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  const tag = await prisma.workTag.upsert({
    where: { slug: seedTagSlug },
    update: { name: seedTagName },
    create: { name: seedTagName, slug: seedTagSlug },
  });

  const existing = await prisma.workProject.findUnique({
    where: { slugDraft: seedProjectSlug },
  });

  if (!existing) {
    await prisma.workProject.create({
      data: {
        templateId: seedTemplateId,
        titleDraft: seedProjectTitle,
        slugDraft: seedProjectSlug,
        excerptDraft: "Seeded project. Replace content in admin.",
        coverImageDraft: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
        draftContent: {
          blocks: [
            {
              id: "hero",
              type: "hero",
              variant: "classic",
              data: {
                eyebrow: "Seed Project",
                headline: seedProjectTitle,
                subheadline: "Edit me in /admin/work.",
                backgroundImage: "",
              },
            },
            {
              id: "overview",
              type: "richText",
              data: {
                title: "Overview",
                body: "This seeded project confirms your work pipeline is functional.",
              },
            },
          ],
        },
        titlePublished: seedProjectTitle,
        slugPublished: seedProjectSlug,
        excerptPublished: "Seeded project. Replace content in admin.",
        coverImagePublished:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",
        publishedContent: {
          blocks: [
            {
              id: "hero",
              type: "hero",
              variant: "classic",
              data: {
                eyebrow: "Seed Project",
                headline: seedProjectTitle,
                subheadline: "Edit me in /admin/work.",
                backgroundImage: "",
              },
            },
          ],
        },
        status: "PUBLISHED",
        publishedAt: new Date(),
        tags: {
          create: [{ tagId: tag.id }],
        },
      },
    });
  } else {
    await prisma.workProjectTag.upsert({
      where: { projectId_tagId: { projectId: existing.id, tagId: tag.id } },
      update: {},
      create: { projectId: existing.id, tagId: tag.id },
    });
  }

  console.log("Work seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
