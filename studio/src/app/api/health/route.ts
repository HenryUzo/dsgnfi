import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/app-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: APP_NAME,
    timestamp: new Date().toISOString(),
  });
}
