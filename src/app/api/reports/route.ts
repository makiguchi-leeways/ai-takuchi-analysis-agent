import { NextResponse } from "next/server";
import { analyzeMarket } from "@/lib/market/report";

export function GET() {
  const report = analyzeMarket();
  return NextResponse.json([
    {
      id: report.id,
      title: report.title,
      createdAt: report.createdAt,
      primaryMunicipality: report.executiveSummary.primaryMunicipality,
      totalScore: report.executiveSummary.totalScore,
      landAcquisitionLimitManYen: report.executiveSummary.landAcquisitionLimitManYen
    }
  ]);
}
