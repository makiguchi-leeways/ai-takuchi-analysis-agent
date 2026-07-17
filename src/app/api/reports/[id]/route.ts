import { NextResponse } from "next/server";
import { analyzeMarket } from "@/lib/market/report";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (id !== "sample-aoba-report") {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }
  return NextResponse.json(analyzeMarket());
}
