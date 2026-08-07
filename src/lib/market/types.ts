export type ProductType = "注文住宅" | "分譲戸建" | "建売住宅" | "土地販売" | "中古戸建再生";

export type AnalysisUnit = "市区町村" | "町丁目" | "駅勢圏" | "任意半径商圏";

export type DataSourceKind = "actual" | "sample";

export type Quadrant = "blue-ocean" | "competitive" | "niche" | "red-ocean";

export type ConversionPotential = "high" | "medium" | "low";

export interface AreaMetric {
  id: string;
  municipalityId: string;
  prefecture: string;
  municipality: string;
  neighborhood: string;
  analysisUnit: AnalysisUnit;
  productType: ProductType;
  population: number;
  households: number;
  populationGrowthRate: number;
  householdGrowthRate: number;
  moveInCount: number;
  moveOutCount: number;
  childHouseholdRate: number;
  averageIncomeManYen: number;
  rentHouseholdRate: number;
  newDetachedSupplyCount: number;
  landListingCount: number;
  competitorSupplyCount: number;
  housingStarts: number;
  transactionCount: number;
  averageLandPriceManYenPerTsubo: number;
  averageSalePriceManYen: number;
  averageRentManYen: number;
  daysOnMarket: number;
  vacancyRate: number;
  dataConfidenceScore: number;
  lat: number;
  lng: number;
  source: DataSourceKind;
}

export interface ScoreWeights {
  overall: {
    liquidity: number;
    demand: number;
    supplyShortage: number;
    purchasingPower: number;
    dataConfidence: number;
  };
  blueOcean: {
    demand: number;
    liquidity: number;
    supplyShortage: number;
    purchasingPower: number;
    competitorPenalty: number;
  };
  opportunity: {
    demand: number;
    supplyDemandGap: number;
    liquidity: number;
    demographic: number;
    accessibility: number;
    profitability: number;
    hazardRisk: number;
    landPriceRisk: number;
  };
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  value: number | null;
  weight: number;
  contribution: number | null;
  direction: "positive" | "negative";
  source: string;
}

export interface ScoreResult {
  overallScore: number;
  liquidityScore: number;
  demandScore: number;
  supplyScore: number;
  supplyShortageScore: number;
  purchasingPowerScore: number;
  competitorOversupplyScore: number;
  blueOceanScore: number;
  redOceanScore: number;
  demandSupplyGap: number;
  opportunityScore: number;
  scoreBreakdown: ScoreBreakdownItem[];
  dataConfidenceScore: number;
  quadrant: Quadrant;
  reasons: string[];
}

export interface RankedArea extends ScoreResult {
  rank: number;
  area: AreaMetric;
}

export interface AnalysisInput {
  prefecture: string;
  municipality: string;
  neighborhood: string;
  analysisUnit: AnalysisUnit;
  comparisonAreas: string[];
  productType: ProductType;
  expectedBuildingPriceManYen: number;
  landAreaTsubo: number;
  buildingAreaTsubo: number;
  targetGrossMarginRate: number;
  otherCostRate: number;
  annualInterestRate: number;
  repaymentYears: number;
  repaymentBurdenRate: number;
  downPaymentManYen: number;
}

export interface BorrowingCapacityInput {
  householdIncomeManYen: number;
  repaymentBurdenRate: number;
  annualInterestRate: number;
  repaymentYears: number;
  downPaymentManYen: number;
}

export interface BorrowingCapacityResult {
  annualRepaymentCapacityManYen: number;
  monthlyRepaymentCapacityManYen: number;
  borrowingCapacityManYen: number;
  purchaseCapacityManYen: number;
}

export interface LandAcquisitionLimitInput {
  purchaseCapacityManYen: number;
  buildingCostManYen: number;
  exteriorCostManYen: number;
  closingCostManYen: number;
  salesAdminCostManYen: number;
  otherCostManYen: number;
  targetGrossMarginRate: number;
}

export interface LandAcquisitionLimitResult {
  minimumSalePriceManYen: number;
  requiredGrossProfitManYen: number;
  totalNonLandCostManYen: number;
  landAcquisitionLimitManYen: number;
  recommendedSalePriceRangeManYen: [number, number];
}

export interface ProcurementCeilingInput {
  expectedSalePriceManYen: number;
  buildingCostManYen: number;
  landDevelopmentCostManYen: number;
  exteriorCostManYen: number;
  demolitionCostManYen: number;
  brokerageCostManYen: number;
  financeCostManYen: number;
  salesAdminCostManYen: number;
  taxesRegistrationCostManYen: number;
  targetProfitManYen: number;
  targetGrossMarginRate: number;
  riskAdjustmentManYen: number;
  landAreaTsubo: number;
}

export interface ProcurementCeilingResult {
  totalCostBeforeLandManYen: number;
  expectedProfitManYen: number;
  grossMarginRate: number;
  landAcquisitionLimitManYen: number;
  landPriceLimitManYenPerTsubo: number;
  safetyMarginManYen: number;
  formula: string[];
}

export interface RentVsBuyInput {
  monthlyRentManYen: number;
  commonServiceFeeManYen: number;
  parkingFeeManYen: number;
  renewalFeeManYen: number;
  purchasePriceManYen: number;
  downPaymentManYen: number;
  annualInterestRate: number;
  repaymentYears: number;
  annualPropertyTaxManYen: number;
  monthlyRepairReserveManYen: number;
  monthlyInsuranceManYen: number;
  monthlyOtherMaintenanceManYen: number;
}

export interface RentVsBuyResult {
  rentMonthlyTotalManYen: number;
  loanMonthlyPaymentManYen: number;
  purchaseMonthlyTotalManYen: number;
  monthlyDifferenceManYen: number;
  rentLifetimeCostManYen: number;
  purchaseLifetimeCostManYen: number;
  conversionPotential: ConversionPotential;
  salesTalk: string;
}

export interface DataCatalogFile {
  id: string;
  root: string;
  relativePath: string;
  absolutePath: string;
  name: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  category:
    | "population"
    | "household"
    | "income"
    | "property"
    | "land-price"
    | "geojson"
    | "api"
    | "source-code"
    | "documentation"
    | "config"
    | "other";
  status: "usable" | "reference" | "needs-mapping" | "sample-only";
  encoding: string | null;
  recordCount: number | null;
  columns: string[];
  keyColumns: string[];
  notes: string[];
}

export interface DataCatalog {
  generatedAt: string;
  roots: string[];
  files: DataCatalogFile[];
}

export interface DataCatalogSummary {
  totalFiles: number;
  usableDataFiles: number;
  categories: Record<string, number>;
  keyColumns: string[];
  latestModifiedAt: string | null;
}

export interface MarketReport {
  id: string;
  title: string;
  createdAt: string;
  input: AnalysisInput;
  sourceMode: DataSourceKind;
  executiveSummary: {
    totalScore: number;
    primaryMunicipality: string;
    focusAreas: string[];
    targetSegment: string;
    expectedHouseholdIncomeManYen: number;
    recommendedSalePriceRangeManYen: [number, number];
    landAcquisitionLimitManYen: number;
    decisionComments: string[];
  };
  rankings: {
    municipalities: RankedArea[];
    neighborhoods: RankedArea[];
  };
  quadrant: RankedArea[];
  blueOceanTop3: RankedArea[];
  landAcquisition: LandAcquisitionLimitResult;
  borrowing: BorrowingCapacityResult;
  rentVsBuy: RentVsBuyResult;
  marketGap: {
    marketAveragePriceManYen: number;
    recommendedPriceManYen: number;
    priceGapRate: number;
    judgment: "割安" | "適正" | "割高";
    action: string;
  };
  actions: string[];
  appendix: {
    dataSources: string[];
    definitions: string[];
    formulas: string[];
    missingValuePolicy: string[];
    assumptions: string[];
    disclaimer: string;
  };
}
