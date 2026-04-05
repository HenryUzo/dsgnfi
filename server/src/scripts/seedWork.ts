import "dotenv/config";

import { prisma } from "../db/prisma";

const seedTagName = process.env.SEED_WORK_TAG_NAME ?? "Branding";
const seedTagSlug = process.env.SEED_WORK_TAG_SLUG ?? "branding";
const seedProjectTitle = process.env.SEED_WORK_PROJECT_TITLE ?? "Sample Work Project";
const seedProjectSlug = process.env.SEED_WORK_PROJECT_SLUG ?? "sample-work-project";
const seedTemplateId = process.env.SEED_WORK_TEMPLATE_ID ?? "classic-case-study";
const defaultTenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "dsgnfi";
const defaultSiteSlug = process.env.DEFAULT_SITE_SLUG ?? "main";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: defaultTenantSlug },
    update: { name: "Dsgnfi" },
    create: { name: "Dsgnfi", slug: defaultTenantSlug },
  });

  const site = await prisma.site.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: defaultSiteSlug } },
    update: { name: "Main Site", status: "ACTIVE", isDefault: true },
    create: {
      tenantId: tenant.id,
      name: "Main Site",
      slug: defaultSiteSlug,
      status: "ACTIVE",
      isDefault: true,
    },
  });

  await prisma.workPageMeta.upsert({
    where: { siteId_key: { siteId: site.id, key: "work" } },
    update: {},
    create: {
      siteId: site.id,
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
    where: { siteId_slug: { siteId: site.id, slug: seedTagSlug } },
    update: { name: seedTagName },
    create: { siteId: site.id, name: seedTagName, slug: seedTagSlug },
  });

  const existing = await prisma.workProject.findFirst({
    where: { siteId: site.id, slugDraft: seedProjectSlug },
  });

  if (!existing) {
    await prisma.workProject.create({
      data: {
        siteId: site.id,
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




