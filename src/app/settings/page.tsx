import { Settings } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { scoreWeights } from "@/lib/market/weights";
import { analyzeMarket } from "@/lib/market/report";
import { percent } from "@/lib/market/format";

export default function SettingsPage() {
  const report = analyzeMarket();

  return (
    <main>
      <AppHeader />
      <section className="page-section">
        <div className="section-heading">
          <Settings size={22} />
          <div>
            <p className="eyebrow">Settings</p>
            <h1>設定・前提条件</h1>
          </div>
        </div>
        <div className="settings-grid">
          <article className="panel">
            <h2>総合スコア重み</h2>
            <dl className="definition-grid">
              {Object.entries(scoreWeights.overall).map(([key, value]) => (
                <div className="definition" key={key}>
                  <dt>{key}</dt>
                  <dd>{percent(value)}</dd>
                </div>
              ))}
            </dl>
          </article>
          <article className="panel">
            <h2>ブルーオーシャン重み</h2>
            <dl className="definition-grid">
              {Object.entries(scoreWeights.blueOcean).map(([key, value]) => (
                <div className="definition" key={key}>
                  <dt>{key}</dt>
                  <dd>{percent(value)}</dd>
                </div>
              ))}
            </dl>
          </article>
          <article className="panel wide-panel">
            <h2>Appendix仮定</h2>
            <ul className="action-list">
              {report.appendix.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
