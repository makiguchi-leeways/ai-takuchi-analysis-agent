export type OpenDataLayerCategory = "population" | "household" | "income" | "rent" | "investment" | "land" | "school" | "zoning";

export interface OpenDataLayerDefinition {
  id: string;
  label: string;
  category: OpenDataLayerCategory;
  dataName: string;
  dataSourceYear: string;
  color: string;
  fillOpacity: number;
  strokeOpacity: number;
  rateUnitType?: "0" | "1";
}

export const OPEN_DATA_LAYERS: OpenDataLayerDefinition[] = [
  {
    id: "population-density",
    label: "人口密度",
    category: "population",
    dataName: "population_density",
    dataSourceYear: "2020",
    color: "#12665d",
    fillOpacity: 0.22,
    strokeOpacity: 0.74
  },
  {
    id: "household-income",
    label: "世帯年収",
    category: "income",
    dataName: "household_income_mean",
    dataSourceYear: "2020",
    color: "#245f9f",
    fillOpacity: 0.2,
    strokeOpacity: 0.72
  },
  {
    id: "rent-mean",
    label: "賃料平均",
    category: "rent",
    dataName: "total_rent_mean",
    dataSourceYear: "2020",
    color: "#7c4d9f",
    fillOpacity: 0.18,
    strokeOpacity: 0.7
  },
  {
    id: "land-price",
    label: "地価公示",
    category: "land",
    dataName: "land_price",
    dataSourceYear: "2021",
    color: "#a86b15",
    fillOpacity: 0.2,
    strokeOpacity: 0.75
  },
  {
    id: "gross-rate",
    label: "キャップレート",
    category: "investment",
    dataName: "total_gross_rate_mean",
    dataSourceYear: "2020",
    color: "#5b6c2f",
    fillOpacity: 0.18,
    strokeOpacity: 0.72
  },
  {
    id: "elementary-school",
    label: "小学校区",
    category: "school",
    dataName: "elementary_school_boundaries",
    dataSourceYear: "2021",
    color: "#2f7f9f",
    fillOpacity: 0.1,
    strokeOpacity: 0.82
  },
  {
    id: "use-district",
    label: "用途地域",
    category: "zoning",
    dataName: "use_district",
    dataSourceYear: "2020",
    color: "#a93a34",
    fillOpacity: 0.16,
    strokeOpacity: 0.74
  }
];

export const DEFAULT_OPEN_DATA_LAYER_IDS = ["population-density", "land-price"];

export function getOpenDataLayer(id: string) {
  return OPEN_DATA_LAYERS.find((layer) => layer.id === id);
}
