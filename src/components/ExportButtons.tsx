"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";

export function ExportButtons({ reportId }: { reportId: string }) {
  async function download(format: "csv" | "excel") {
    const response = await fetch(`/api/reports/${reportId}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ format })
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = format === "csv" ? `${reportId}.csv` : `${reportId}.xlsx-compatible.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="action-row no-print">
      <button className="primary-button" type="button" onClick={() => window.print()}>
        <Printer size={18} />
        印刷
      </button>
      <button className="secondary-button" type="button" onClick={() => download("csv")}>
        <Download size={18} />
        CSV
      </button>
      <button className="secondary-button" type="button" onClick={() => download("excel")}>
        <FileSpreadsheet size={18} />
        Excel互換
      </button>
    </div>
  );
}
