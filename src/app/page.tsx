import { MarketMapWorkspace } from "@/components/MarketMapWorkspace";
import { analyzeMarket } from "@/lib/market/report";

export default function HomePage() {
  const report = analyzeMarket();
  return <MarketMapWorkspace report={report} />;
}
