import type { ProductType } from "./types";

export type ListingSource = "reins" | "homes" | "suumo" | "athome" | "rakumachi" | "kenbiya";
export type ListingDataMode = "preview" | "crawl" | "api";

export type ListingSourceDefinition = {
  id: ListingSource;
  label: string;
  homepage: string;
  accessNote: string;
};

export type LandListing = {
  id: string;
  title: string;
  source: ListingSource;
  sourceLabel: string;
  dataMode: ListingDataMode;
  prefecture: string;
  municipality: string;
  neighborhood: string;
  address: string;
  priceManYen: number;
  landAreaTsubo: number;
  pricePerTsuboManYen: number;
  station: string;
  walkMinutes: number;
  zoning: string;
  publishedAt: string;
  listingUrl: string;
  inquiryUrl: string;
};

export type LandListingSearchQuery = {
  prefecture: string;
  municipality: string;
  neighborhood: string;
  productType: ProductType;
  averageLandPriceManYenPerTsubo: number;
};

export const LISTING_SOURCE_DEFINITIONS: ListingSourceDefinition[] = [
  { id: "reins", label: "レインズ", homepage: "https://www.reins.or.jp/", accessNote: "媒介契約・利用権限が必要" },
  { id: "homes", label: "HOME'S", homepage: "https://www.homes.co.jp/", accessNote: "公式掲載ページ・提供条件に準拠" },
  { id: "suumo", label: "SUUMO", homepage: "https://suumo.jp/", accessNote: "公式掲載ページ・提供条件に準拠" },
  { id: "athome", label: "at home", homepage: "https://www.athome.co.jp/", accessNote: "公式掲載ページ・提供条件に準拠" },
  { id: "rakumachi", label: "楽待", homepage: "https://www.rakumachi.jp/", accessNote: "公式掲載ページ・提供条件に準拠" },
  { id: "kenbiya", label: "健美家", homepage: "https://www.kenbiya.com/", accessNote: "公式掲載ページ・提供条件に準拠" }
];

const LISTING_TEMPLATES: Array<{
  source: ListingSource;
  areaMultiplier: number;
  priceMultiplier: number;
  walkMinutes: number;
  zoning: string;
}> = [
  { source: "homes", areaMultiplier: 0.92, priceMultiplier: 1.02, walkMinutes: 8, zoning: "第一種低層住居専用地域" },
  { source: "suumo", areaMultiplier: 1.08, priceMultiplier: 0.96, walkMinutes: 11, zoning: "第一種低層住居専用地域" },
  { source: "athome", areaMultiplier: 0.78, priceMultiplier: 1.12, walkMinutes: 15, zoning: "第二種中高層住居専用地域" },
  { source: "rakumachi", areaMultiplier: 1.32, priceMultiplier: 0.88, walkMinutes: 6, zoning: "近隣商業地域" },
  { source: "kenbiya", areaMultiplier: 1.16, priceMultiplier: 1.08, walkMinutes: 13, zoning: "第一種住居地域" },
  { source: "reins", areaMultiplier: 0.98, priceMultiplier: 0.91, walkMinutes: 10, zoning: "第一種低層住居専用地域" }
];

export function getPreviewLandListings(query: LandListingSearchQuery): LandListing[] {
  const baseArea = 34;
  const basePricePerTsubo = Math.max(50, query.averageLandPriceManYenPerTsubo);

  return LISTING_TEMPLATES.map((template, index) => {
    const source = LISTING_SOURCE_DEFINITIONS.find((item) => item.id === template.source) as ListingSourceDefinition;
    const landAreaTsubo = Math.round(baseArea * template.areaMultiplier * 10) / 10;
    const pricePerTsuboManYen = Math.round(basePricePerTsubo * template.priceMultiplier);
    const priceManYen = Math.round(pricePerTsuboManYen * landAreaTsubo);
    const address = `${query.neighborhood}${index + 1}番地（プレビュー）`;

    return {
      id: `preview-${query.municipality}-${query.neighborhood}-${template.source}`,
      title: `${query.neighborhood} 土地売出候補 ${index + 1}`,
      source: template.source,
      sourceLabel: source.label,
      dataMode: "preview",
      prefecture: query.prefecture,
      municipality: query.municipality,
      neighborhood: query.neighborhood,
      address,
      priceManYen,
      landAreaTsubo,
      pricePerTsuboManYen,
      station: index % 2 === 0 ? "たまプラーザ駅" : "あざみ野駅",
      walkMinutes: template.walkMinutes,
      zoning: template.zoning,
      publishedAt: "2026-08-07",
      listingUrl: source.homepage,
      inquiryUrl: source.homepage
    };
  });
}
