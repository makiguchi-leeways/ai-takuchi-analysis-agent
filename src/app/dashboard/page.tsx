import { MarketMapWorkspace } from "@/components/MarketMapWorkspace";
import { analyzeMarket } from "@/lib/market/report";

export default function DashboardPage() {
  const report = analyzeMarket();
  return <MarketMapWorkspace report={report} />;
}
