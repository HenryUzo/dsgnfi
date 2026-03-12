import "dotenv/config";
import bcrypt from "bcryptjs";

import { prisma } from "../db/prisma";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@dsgnfi.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow123!";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  // Minimal output for verification in local runs
  console.log(`Seeded admin user: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
