import "dotenv/config";
import bcrypt from "bcryptjs";

import { prisma } from "../db/prisma";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@dsgnfi.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow123!";
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "dsgnfi";
  const siteSlug = process.env.DEFAULT_SITE_SLUG ?? "main";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: "Dsgnfi" },
    create: { name: "Dsgnfi", slug: tenantSlug },
  });

  const site = await prisma.site.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: siteSlug } },
    update: {
      name: "Main Site",
      isDefault: true,
      status: "ACTIVE",
    },
    create: {
      tenantId: tenant.id,
      name: "Main Site",
      slug: siteSlug,
      isDefault: true,
      status: "ACTIVE",
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: admin.id, tenantId: tenant.id } },
    update: { role: "OWNER" },
    create: {
      userId: admin.id,
      tenantId: tenant.id,
      role: "OWNER",
    },
  });

  console.log(`Seeded admin user: ${admin.email} (${tenant.slug}/${site.slug})`);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
