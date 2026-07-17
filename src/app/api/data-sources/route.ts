import { NextResponse } from "next/server";
import { dataCatalog, getDataCatalogSummary } from "@/lib/market/catalogServer";

export function GET() {
  return NextResponse.json({
    summary: getDataCatalogSummary(),
    ...dataCatalog
  });
}
