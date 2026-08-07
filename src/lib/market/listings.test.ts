import { describe, expect, it } from "vitest";
import { getPreviewLandListings, LISTING_SOURCE_DEFINITIONS } from "./listings";

describe("land listing search", () => {
  it("returns one preview candidate for each requested portal source", () => {
    const listings = getPreviewLandListings({
      prefecture: "神奈川県",
      municipality: "横浜市青葉区",
      neighborhood: "美しが丘1丁目",
      productType: "分譲戸建",
      averageLandPriceManYenPerTsubo: 155
    });

    expect(listings).toHaveLength(LISTING_SOURCE_DEFINITIONS.length);
    expect(new Set(listings.map((listing) => listing.source)).size).toBe(6);
    expect(listings.every((listing) => listing.dataMode === "preview")).toBe(true);
    expect(listings.every((listing) => listing.priceManYen > 0 && listing.landAreaTsubo > 0)).toBe(true);
  });
});
