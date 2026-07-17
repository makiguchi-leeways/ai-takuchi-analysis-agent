import { NextResponse } from "next/server";
import { getAreas } from "@/lib/market/report";

export function GET() {
  return NextResponse.json(getAreas());
}
