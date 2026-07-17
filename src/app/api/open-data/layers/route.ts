import { NextResponse } from "next/server";
import { DEFAULT_OPEN_DATA_LAYER_IDS, OPEN_DATA_LAYERS } from "@/lib/market/openData";

export function GET() {
  return NextResponse.json({
    defaultLayerIds: DEFAULT_OPEN_DATA_LAYER_IDS,
    layers: OPEN_DATA_LAYERS
  });
}
