import "dotenv/config";

import { prisma } from "../db/prisma";
import { ensureTemplateCatalog } from "../services/templateCatalog";

async function main() {
  await ensureTemplateCatalog(prisma);
  console.log("Template catalog seed complete.");
}

main()
  .catch((error) => {
    console.error("Failed to seed template catalog:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
