import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Bounds = [number, number, number, number];

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bounds = parseBounds(searchParams.get("bounds"));

  if (!bounds) {
    return NextResponse.json({ error: "bounds must be south,west,north,east." }, { status: 400 });
  }

  try {
    const payload = await fetchOverpass(bounds);
    return NextResponse.json(toGeoJson(payload, bounds));
  } catch (error) {
    return NextResponse.json(
      buildFallbackGeoJson(bounds, error instanceof Error ? error.message : "transport data unavailable"),
      { status: 200 }
    );
  }
}

async function fetchOverpass(bounds: Bounds) {
  const [south, west, north, east] = bounds;
  const query = `[out:json][timeout:20];(way["railway"~"^(rail|light_rail|subway|tram)$"](${south},${west},${north},${east});node["railway"~"^(station|halt|tram_stop|subway_entrance)$"](${south},${west},${north},${east});node["public_transport"="station"](${south},${west},${north},${east}););out body geom;`;
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        lastError = new Error(`Overpass returned HTTP ${response.status}.`);
        continue;
      }
      return (await response.json()) as { elements?: OverpassElement[] };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Overpass request failed.");
}

type OverpassElement = {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type TransportFeature = {
  type: "Feature";
  properties: Record<string, string>;
  geometry: {
    type: "LineString" | "Point";
    coordinates: number[][] | number[];
  };
};

function toGeoJson(payload: { elements?: OverpassElement[] }, bounds: Bounds) {
  const features: TransportFeature[] = (payload.elements ?? []).flatMap((element): TransportFeature[] => {
    const tags = element.tags ?? {};
    const properties = {
      name: tags.name ?? (element.type === "way" ? "鉄道路線" : "駅"),
      railway: tags.railway ?? "",
      ref: tags.ref ?? "",
      operator: tags.operator ?? "",
      source: "OpenStreetMap"
    };

    if (element.type === "way" && element.geometry && element.geometry.length > 1) {
      return [{
        type: "Feature",
        properties,
        geometry: { type: "LineString", coordinates: element.geometry.map((point) => [point.lon, point.lat]) }
      }];
    }

    if (element.type === "node" && typeof element.lat === "number" && typeof element.lon === "number") {
      return [{
        type: "Feature",
        properties,
        geometry: { type: "Point", coordinates: [element.lon, element.lat] }
      }];
    }

    return [];
  });

  return {
    type: "FeatureCollection" as const,
    metadata: {
      source: "openstreetmap" as const,
      provider: "OpenStreetMap Overpass API",
      fetchedAt: new Date().toISOString(),
      bounds
    },
    features: features.slice(0, 1200)
  };
}

function buildFallbackGeoJson(bounds: Bounds, detail: string) {
  const [south, west, north, east] = bounds;
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const isAobaPreview = south < 35.61 && north > 35.53 && west < 139.61 && east > 139.49;

  if (isAobaPreview) {
    const denEnToshiStations: Array<[number, number, string]> = [
      [139.558, 35.576, "たまプラーザ"],
      [139.552, 35.568, "あざみ野"],
      [139.551, 35.558, "江田"],
      [139.538, 35.551, "市が尾"],
      [139.527, 35.543, "藤が丘"],
      [139.516, 35.542, "青葉台"]
    ];
    const blueLine: Array<[number, number]> = [
      [139.552, 35.568],
      [139.557, 35.558],
      [139.562, 35.547],
      [139.566, 35.536]
    ];
    return {
      type: "FeatureCollection" as const,
      metadata: { source: "sample" as const, reason: "transport-upstream-error", detail, provider: "OpenStreetMap Overpass API" },
      features: [
        {
          type: "Feature" as const,
          properties: { name: "東急田園都市線", railway: "rail", source: "sample" },
          geometry: { type: "LineString" as const, coordinates: denEnToshiStations.map(([lon, lat]) => [lon, lat]) }
        },
        {
          type: "Feature" as const,
          properties: { name: "横浜市営地下鉄ブルーライン", railway: "subway", source: "sample" },
          geometry: { type: "LineString" as const, coordinates: blueLine }
        },
        ...denEnToshiStations.map(([lon, lat, name]) => ({
          type: "Feature" as const,
          properties: { name, railway: "station", source: "sample" },
          geometry: { type: "Point" as const, coordinates: [lon, lat] }
        }))
      ]
    };
  }

  const line = [
    [west, centerLat - (north - south) * 0.08],
    [centerLng - (east - west) * 0.18, centerLat],
    [centerLng + (east - west) * 0.16, centerLat + (north - south) * 0.08],
    [east, centerLat + (north - south) * 0.18]
  ];
  const features = [
    { type: "Feature" as const, properties: { name: "路線プレビュー", railway: "rail", source: "sample" }, geometry: { type: "LineString" as const, coordinates: line } },
    ...[0.22, 0.52, 0.8].map((ratio, index) => ({
      type: "Feature" as const,
      properties: { name: `駅プレビュー ${index + 1}`, railway: "station", source: "sample" },
      geometry: { type: "Point" as const, coordinates: [west + (east - west) * ratio, centerLat + (north - south) * (ratio - 0.5) * 0.25] }
    }))
  ];

  return {
    type: "FeatureCollection" as const,
    metadata: { source: "sample" as const, reason: "transport-upstream-error", detail, provider: "OpenStreetMap Overpass API" },
    features
  };
}

function parseBounds(value: string | null): Bounds | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east) return null;
  return [south, west, north, east];
}
