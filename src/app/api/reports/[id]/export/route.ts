import { NextResponse } from "next/server";
import { analyzeMarket } from "@/lib/market/report";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (id !== "sample-aoba-report") {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => ({ format: "csv" }));
  const report = analyzeMarket();
  const rows = [
    ["section", "name", "value", "note"],
    ["summary", "primary_municipality", report.executiveSummary.primaryMunicipality, report.title],
    ["summary", "total_score", report.executiveSummary.totalScore, "0-100"],
    ["finance", "borrowing_capacity_man_yen", report.borrowing.borrowingCapacityManYen, "元利均等返済"],
    ["finance", "land_acquisition_limit_man_yen", report.landAcquisition.landAcquisitionLimitManYen, "仕入れ上限"],
    ["rent_vs_buy", "rent_monthly_total_man_yen", report.rentVsBuy.rentMonthlyTotalManYen, "賃貸継続月額"],
    ["rent_vs_buy", "purchase_monthly_total_man_yen", report.rentVsBuy.purchaseMonthlyTotalManYen, "購入後月額"],
    ...report.blueOceanTop3.map((item) => [
      "blue_ocean_top3",
      item.area.neighborhood,
      item.blueOceanScore,
      item.reasons.join(" ")
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": body.format === "excel" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8"
    }
  });
}
