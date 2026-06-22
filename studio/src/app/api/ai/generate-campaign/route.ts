import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "Campaign generation is not implemented yet. This route exists to reserve a server-only OpenAI boundary.",
    },
    { status: 501 },
  );
}
