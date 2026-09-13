import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    hasDb: !!process.env.DATABASE_URL,
    dbUrl: process.env.DATABASE_URL?.substring(0, 20) + "..." 
  });
}
