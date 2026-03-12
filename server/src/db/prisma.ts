import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing in .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Prisma 7 requires options (adapter OR accelerateUrl)
export const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});