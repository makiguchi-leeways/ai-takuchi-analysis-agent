import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "housing-market-report-mvp",
    checkedAt: new Date().toISOString()
  });
}
