import { MarketMapWorkspace } from "@/components/MarketMapWorkspace";
import { analyzeMarket } from "@/lib/market/report";

export default function ProcurementPage() {
  return <MarketMapWorkspace report={analyzeMarket()} />;
}
