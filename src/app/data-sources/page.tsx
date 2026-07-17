import { Database } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { bytes } from "@/lib/market/format";
import { dataCatalog, getDataCatalogSummary } from "@/lib/market/catalogServer";

export default function DataSourcesPage() {
  const summary = getDataCatalogSummary();

  return (
    <main>
      <AppHeader />
      <section className="page-section">
        <div className="section-heading">
          <Database size={22} />
          <div>
            <p className="eyebrow">Data Catalog</p>
            <h1>データ管理</h1>
          </div>
        </div>
        <div className="kpi-grid">
          <article className="metric-card">
            <span>棚卸しファイル</span>
            <strong>{summary.totalFiles}</strong>
            <small>node_modules/.next/.git除外</small>
          </article>
          <article className="metric-card">
            <span>利用候補データ</span>
            <strong>{summary.usableDataFiles}</strong>
            <small>CSV/JSON/GIS系</small>
          </article>
          <article className="metric-card">
            <span>キー候補</span>
            <strong>{summary.keyColumns.length}</strong>
            <small>{summary.keyColumns.slice(0, 4).join(", ")}</small>
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>データソース名</th>
                <th>分類</th>
                <th>状態</th>
                <th>件数</th>
                <th>サイズ</th>
                <th>カラム/キー</th>
                <th>エラー・注意</th>
              </tr>
            </thead>
            <tbody>
              {dataCatalog.files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <strong>{file.name}</strong>
                    <small>{file.absolutePath}</small>
                  </td>
                  <td>{file.category}</td>
                  <td>{file.status}</td>
                  <td>{file.recordCount?.toLocaleString("ja-JP") ?? "-"}</td>
                  <td>{bytes(file.sizeBytes)}</td>
                  <td>
                    <small>{file.keyColumns.join(", ") || "キー未確認"}</small>
                    <small>{file.columns.slice(0, 5).join(", ")}</small>
                  </td>
                  <td>{file.notes.join(" / ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
