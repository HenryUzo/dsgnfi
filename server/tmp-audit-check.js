const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      action: true,
      entityType: true,
      entityId: true,
      siteId: true,
      createdAt: true,
      metadata: true,
    },
  });
  console.log(JSON.stringify(rows));
}
main().finally(() => prisma.$disconnect());
