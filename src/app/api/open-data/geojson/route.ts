import { NextRequest, NextResponse } from "next/server";
import { getOpenDataLayer, type OpenDataLayerDefinition } from "@/lib/market/openData";

export const dynamic = "force-dynamic";

const DEFAULT_GATE_API_BASE_URL = "https://enterprise-staging-api.gate.estate";

type Bounds = [number, number, number, number];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get("layer") ?? "";
  const bounds = parseBounds(searchParams.get("bounds"));
  const layer = getOpenDataLayer(layerId);

  if (!layer) {
    return NextResponse.json({ error: "Unknown open-data layer." }, { status: 400 });
  }

  if (!bounds) {
    return NextResponse.json({ error: "bounds must be south,west,north,east." }, { status: 400 });
  }

  const apiKey = process.env.GATE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildFallbackGeoJson(layer, bounds, "missing-api-key"));
  }

  const upstreamUrl = buildGateApiUrl(layer, bounds, searchParams.get("year"));

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey
      },
      next: { revalidate: 60 * 30 }
    });

    const body = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        buildFallbackGeoJson(layer, bounds, "gate-api-error", {
          status: response.status,
          detail: body.slice(0, 240)
        })
      );
    }

    try {
      const geoJson = JSON.parse(body);
      return NextResponse.json(withMetadata(geoJson, layer, "gate-api"));
    } catch {
      return NextResponse.json(buildFallbackGeoJson(layer, bounds, "invalid-gate-api-json"));
    }
  } catch (error) {
    return NextResponse.json(
      buildFallbackGeoJson(layer, bounds, "gate-api-request-failed", {
        detail: error instanceof Error ? error.message : "unknown error"
      })
    );
  }
}

function buildGateApiUrl(layer: OpenDataLayerDefinition, bounds: Bounds, requestedYear: string | null) {
  const baseUrl = process.env.GATE_API_BASE_URL ?? DEFAULT_GATE_API_BASE_URL;
  const endpoint = new URL("/ms-map-layer/v3/map/geojson", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  endpoint.searchParams.set("bounds", bounds.join(","));
  endpoint.searchParams.set("data_name", layer.dataName);
  endpoint.searchParams.set("data_source_year", requestedYear || layer.dataSourceYear);
  if (layer.rateUnitType) endpoint.searchParams.set("rate_unit_type", layer.rateUnitType);
  return endpoint;
}

function parseBounds(value: string | null): Bounds | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east) return null;
  return [south, west, north, east];
}

function withMetadata(geoJson: unknown, layer: OpenDataLayerDefinition, source: "gate-api" | "sample") {
  if (geoJson && typeof geoJson === "object") {
    return {
      ...(geoJson as Record<string, unknown>),
      metadata: {
        ...((geoJson as { metadata?: Record<string, unknown> }).metadata ?? {}),
        source,
        layer
      }
    };
  }
  return geoJson;
}

function buildFallbackGeoJson(
  layer: OpenDataLayerDefinition,
  bounds: Bounds,
  reason: string,
  upstream?: { status?: number; detail?: string }
) {
  const [south, west, north, east] = bounds;
  const latStep = (north - south) / 2;
  const lngStep = (east - west) / 2;

  const features = Array.from({ length: 4 }, (_, index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const cellSouth = south + latStep * row;
    const cellNorth = cellSouth + latStep;
    const cellWest = west + lngStep * column;
    const cellEast = cellWest + lngStep;

    return {
      type: "Feature",
      properties: {
        name: `${layer.label} プレビュー ${index + 1}`,
        value: Math.round((index + 1) * 24.5),
        source: "sample"
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [cellWest, cellSouth],
            [cellEast, cellSouth],
            [cellEast, cellNorth],
            [cellWest, cellNorth],
            [cellWest, cellSouth]
          ]
        ]
      }
    };
  });

  return {
    type: "FeatureCollection",
    metadata: {
      source: "sample",
      reason,
      upstream,
      layer
    },
    features
  };
}
