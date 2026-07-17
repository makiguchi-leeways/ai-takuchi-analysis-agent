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
  }
};
