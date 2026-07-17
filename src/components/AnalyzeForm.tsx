"use client";

import { useState } from "react";
import { BarChart3, CircleAlert, Play } from "lucide-react";
import { defaultAnalysisInput } from "@/lib/market/sampleData";
import type { AnalysisInput, AnalysisUnit, ProductType } from "@/lib/market/types";

const productTypes: ProductType[] = ["注文住宅", "分譲戸建", "建売住宅", "土地販売", "中古戸建再生"];
const analysisUnits: AnalysisUnit[] = ["市区町村", "町丁目", "駅勢圏", "任意半径商圏"];

export function AnalyzeForm() {
  const [input, setInput] = useState<AnalysisInput>(defaultAnalysisInput);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof AnalysisInput>(key: K, value: AnalysisInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    if (input.expectedBuildingPriceManYen <= 0 || input.landAreaTsubo <= 0 || input.buildingAreaTsubo <= 0) {
      setError("建物価格、土地面積、建物面積は0より大きい値を入力してください。");
      return;
    }
    if (input.targetGrossMarginRate <= 0 || input.targetGrossMarginRate >= 0.5) {
      setError("目標粗利率は1%から49%の範囲で入力してください。");
      return;
    }
    window.localStorage.setItem("housing-market-analysis-input", JSON.stringify(input));
    window.location.href = "/dashboard";
  }

  return (
    <section className="form-shell">
      <div className="section-heading">
        <BarChart3 size={22} />
        <div>
          <p className="eyebrow">Analysis Condition</p>
          <h1>分析条件入力</h1>
        </div>
      </div>

      {error ? (
        <div className="error-box">
          <CircleAlert size={18} />
          {error}
        </div>
      ) : null}

      <div className="form-grid">
        <label>
          都道府県
          <select value={input.prefecture} onChange={(event) => update("prefecture", event.target.value)}>
            <option>神奈川県</option>
          </select>
        </label>
        <label>
          市区町村
          <select value={input.municipality} onChange={(event) => update("municipality", event.target.value)}>
            <option>横浜市青葉区</option>
            <option>横浜市都筑区</option>
            <option>横浜市港北区</option>
            <option>横浜市緑区</option>
            <option>川崎市宮前区</option>
          </select>
        </label>
        <label>
          町丁目
          <select value={input.neighborhood} onChange={(event) => update("neighborhood", event.target.value)}>
            <option>美しが丘1丁目</option>
            <option>あざみ野2丁目</option>
            <option>荏田北</option>
            <option>たまプラーザ周辺</option>
          </select>
        </label>
        <label>
          分析単位
          <select value={input.analysisUnit} onChange={(event) => update("analysisUnit", event.target.value as AnalysisUnit)}>
            {analysisUnits.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
        <label>
          商品タイプ
          <select value={input.productType} onChange={(event) => update("productType", event.target.value as ProductType)}>
            {productTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          比較対象エリア
          <input
            value={input.comparisonAreas.join("、")}
            onChange={(event) => update("comparisonAreas", event.target.value.split(/[、,]/).map((item) => item.trim()).filter(Boolean))}
          />
        </label>
        <label>
          想定建物価格
          <input
            type="number"
            value={input.expectedBuildingPriceManYen}
            onChange={(event) => update("expectedBuildingPriceManYen", Number(event.target.value))}
          />
        </label>
        <label>
          想定土地面積
          <input type="number" value={input.landAreaTsubo} onChange={(event) => update("landAreaTsubo", Number(event.target.value))} />
        </label>
        <label>
          想定建物面積
          <input
            type="number"
            value={input.buildingAreaTsubo}
            onChange={(event) => update("buildingAreaTsubo", Number(event.target.value))}
          />
        </label>
        <label>
          目標粗利率
          <input
            type="number"
            step="0.01"
            value={input.targetGrossMarginRate}
            onChange={(event) => update("targetGrossMarginRate", Number(event.target.value))}
          />
        </label>
        <label>
          その他原価率
          <input type="number" step="0.01" value={input.otherCostRate} onChange={(event) => update("otherCostRate", Number(event.target.value))} />
        </label>
        <label>
          住宅ローン金利
          <input
            type="number"
            step="0.001"
            value={input.annualInterestRate}
            onChange={(event) => update("annualInterestRate", Number(event.target.value))}
          />
        </label>
        <label>
          返済年数
          <input type="number" value={input.repaymentYears} onChange={(event) => update("repaymentYears", Number(event.target.value))} />
        </label>
        <label>
          返済負担率
          <input
            type="number"
            step="0.01"
            value={input.repaymentBurdenRate}
            onChange={(event) => update("repaymentBurdenRate", Number(event.target.value))}
          />
        </label>
        <label>
          自己資金
          <input type="number" value={input.downPaymentManYen} onChange={(event) => update("downPaymentManYen", Number(event.target.value))} />
        </label>
      </div>

      <button className="primary-button wide-button" type="button" onClick={submit}>
        <Play size={18} />
        分析実行
      </button>
    </section>
  );
}
