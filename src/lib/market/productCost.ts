import type { ProductType } from "./types";

export type ProductCostProfile = {
  buildingCostManYen: number;
  buildingCostApplicable: boolean;
  note: string;
};

// 開発用の標準初期値。実運用では商品マスタや案件別見積で上書きする。
export const PRODUCT_COST_PROFILES: Record<ProductType, ProductCostProfile> = {
  "分譲戸建": {
    buildingCostManYen: 3100,
    buildingCostApplicable: true,
    note: "商品別の開発用初期値です。案件ごとの見積原価に変更できます。"
  },
  "建売住宅": {
    buildingCostManYen: 2800,
    buildingCostApplicable: true,
    note: "建売住宅の開発用初期値です。案件ごとの見積原価に変更できます。"
  },
  "注文住宅": {
    buildingCostManYen: 3600,
    buildingCostApplicable: true,
    note: "注文住宅の開発用初期値です。仕様確定後の見積原価に変更できます。"
  },
  "土地販売": {
    buildingCostManYen: 0,
    buildingCostApplicable: false,
    note: "土地販売では建物を建築しないため、建築原価は計上しません。"
  },
  "中古戸建再生": {
    buildingCostManYen: 1800,
    buildingCostApplicable: true,
    note: "取得後の改修・再生工事費を含む開発用初期値です。"
  }
};

export function getProductCostProfile(productType: ProductType) {
  return PRODUCT_COST_PROFILES[productType];
}
