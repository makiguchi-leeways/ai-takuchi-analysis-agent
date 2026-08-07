import type { ScoreWeights } from "./types";

export const scoreWeights: ScoreWeights = {
  overall: {
    liquidity: 0.25,
    demand: 0.25,
    supplyShortage: 0.2,
    purchasingPower: 0.2,
    dataConfidence: 0.1
  },
  blueOcean: {
    demand: 0.35,
    liquidity: 0.25,
    supplyShortage: 0.25,
    purchasingPower: 0.15,
    competitorPenalty: 0.18
  },
  opportunity: {
    demand: 0.22,
    supplyDemandGap: 0.22,
    liquidity: 0.16,
    demographic: 0.14,
    accessibility: 0.08,
    profitability: 0.1,
    hazardRisk: 0.04,
    landPriceRisk: 0.04
  }
};
