import { NextResponse } from "next/server";
import { getPreviewLandListings, LISTING_SOURCE_DEFINITIONS } from "@/lib/market/listings";
import { sampleAreas } from "@/lib/market/sampleData";
import type { ProductType } from "@/lib/market/types";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const prefecture = params.get("prefecture") ?? "";
  const municipality = params.get("municipality") ?? "";
  const neighborhood = params.get("neighborhood") ?? "";
  const productType = (params.get("productType") ?? "分譲戸建") as ProductType;

  if (!prefecture || !municipality || !neighborhood) {
    return NextResponse.json({ error: "都道府県・市区町村・町名を指定してください。" }, { status: 400 });
  }

  const matchedArea = sampleAreas.find(
    (area) => area.prefecture === prefecture && area.municipality === municipality && area.neighborhood === neighborhood
  );
  const listings = getPreviewLandListings({
    prefecture,
    municipality,
    neighborhood,
    productType,
    averageLandPriceManYenPerTsubo: matchedArea?.averageLandPriceManYenPerTsubo ?? 120
  });

  return NextResponse.json({
    sourceMode: "preview",
    message: "各ポータルの個別掲載URLが未接続のため、開発用候補を表示しています。接続後はlistingUrl・inquiryUrlを個別掲載URLへ差し替えます。",
    query: { prefecture, municipality, neighborhood, productType },
    sources: LISTING_SOURCE_DEFINITIONS,
    listings
  });
}
