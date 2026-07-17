import { NextResponse } from "next/server";
import { analyzeMarket, getSampleInput } from "@/lib/market/report";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(analyzeMarket({ ...getSampleInput(), ...body }));
}
