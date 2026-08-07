# Scoring

## Existing scores

All component indicators are normalized to 0-100 before weighting.

- `demandScore`: population/household change, child household ratio, income, and renter ratio.
- `supplyScore`: new detached supply, land listings, competitor supply, housing starts, and days on market.
- `demandSupplyGap`: `demandScore - supplyScore`, displayed on a -100 to +100 scale.
- `liquidityScore`: population movement, household movement, transaction rate, days on market, and vacancy rate.
- `purchasingPowerScore`: income, sale price, and rent indicators.

## Procurement opportunity score

Weights live in `src/lib/market/weights.ts`, not inside UI code. The opportunity score uses the available positive indicators and explicitly excludes missing accessibility and hazard values from the calculation. Land-price risk is deducted when the land-price input is available.

The UI exposes each component, weight, value, source, and contribution in the right detail drawer. This makes a high score explainable rather than a single opaque number.

## Procurement ceiling

`calculateProcurementCeiling` calculates:

```text
土地仕入上限 = 想定総売上
             - 建築原価
             - 造成・外構・解体費
             - 仲介・金融・販売管理費
             - 税金等
             - 目標利益
             - リスク調整額
```

The drawer also shows the ceiling per tsubo and a -10%, -5%, base, +5% selling-price sensitivity table.
