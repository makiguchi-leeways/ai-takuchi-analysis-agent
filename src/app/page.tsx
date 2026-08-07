import { MarketMapWorkspace } from "@/components/MarketMapWorkspace";
import { analyzeMarket } from "@/lib/market/report";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ municipality?: string; address?: string }> }) {
  const report = analyzeMarket();
  const params = await searchParams;
  return <MarketMapWorkspace report={report} initialSearch={params} />;
}
