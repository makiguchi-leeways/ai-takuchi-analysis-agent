import { describe, expect, it } from "vitest";
import { getProductCostProfile } from "./productCost";

describe("product cost profiles", () => {
  it("returns a different construction cost for each housing product", () => {
    expect(getProductCostProfile("分譲戸建").buildingCostManYen).toBe(3100);
    expect(getProductCostProfile("建売住宅").buildingCostManYen).toBe(2800);
    expect(getProductCostProfile("注文住宅").buildingCostManYen).toBe(3600);
    expect(getProductCostProfile("中古戸建再生").buildingCostManYen).toBe(1800);
  });

  it("treats land sales as not applicable to construction cost", () => {
    expect(getProductCostProfile("土地販売")).toMatchObject({
      buildingCostManYen: 0,
      buildingCostApplicable: false
    });
  });
});
