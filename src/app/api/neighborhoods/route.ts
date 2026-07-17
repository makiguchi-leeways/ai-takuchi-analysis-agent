import { NextResponse } from "next/server";
import { analyzeMarket } from "@/lib/market/report";

export function GET() {
  return NextResponse.json(analyzeMarket().rankings.neighborhoods);
}
