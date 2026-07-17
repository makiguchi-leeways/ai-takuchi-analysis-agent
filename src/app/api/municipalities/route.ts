import { NextResponse } from "next/server";
import { rankAreas } from "@/lib/market/scoring";
import { getAreas } from "@/lib/market/report";
import { scoreWeights } from "@/lib/market/weights";

export function GET() {
  const areas = getAreas();
  const unique = [...new Map(areas.map((area) => [area.municipalityId, area])).values()];
  return NextResponse.json(rankAreas(unique, scoreWeights));
}
