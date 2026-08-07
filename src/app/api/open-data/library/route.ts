import { NextRequest, NextResponse } from "next/server";
import { getOpenDataLayer, type OpenDataLayerDefinition } from "@/lib/market/openData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LIBRARY_BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
const TILE_ZOOM = 14;
const MAX_TILES = 16;
type Bounds = [number, number, number, number];
type LibraryLayerId = "transaction-price" | "past-transactions" | "use-district" | "building-regulation" | "development";

const LIBRARY_LAYER_IDS = new Set<LibraryLayerId>([
  "transaction-price",
  "past-transactions",
  "use-district",
  "building-regulation",
  "development"
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const layerId = searchParams.get("layer") ?? "";
  const bounds = parseBounds(searchParams.get("bounds"));
  const layer = getOpenDataLayer(layerId);

  if (!layer || !LIBRARY_LAYER_IDS.has(layerId as LibraryLayerId)) {
    return NextResponse.json({ error: "Unknown real-estate library layer." }, { status: 400 });
  }
  if (!bounds) {
    return NextResponse.json({ error: "bounds must be south,west,north,east." }, { status: 400 });
  }

  const apiKey = resolveLibraryApiKey();
  if (apiKey) {
    try {
      const geoJson = await fetchLibraryLayer(layerId as LibraryLayerId, bounds, searchParams.get("year"), apiKey);
      return NextResponse.json(withMetadata(geoJson, layer, "real-estate-library"));
    } catch (error) {
      return NextResponse.json(buildFallbackGeoJson(layer, bounds, "library-api-error", errorMessage(error)));
    }
  }

  return NextResponse.json(buildFallbackGeoJson(layer, bounds, "library-api-key-not-configured"));
}

async function fetchLibraryLayer(layerId: LibraryLayerId, bounds: Bounds, requestedYear: string | null, apiKey: string) {
  const tiles = getTiles(bounds, TILE_ZOOM);
  const endpoint = layerId === "transaction-price" || layerId === "past-transactions" ? "XPT001" : "XKT002";
  const period = resolvePeriod(requestedYear, layerId);
  const responses = await Promise.all(tiles.map(async ({ x, y }) => {
    const url = new URL(`${resolveLibraryBaseUrl()}/${endpoint}`);
    url.searchParams.set("response_format", "geojson");
    url.searchParams.set("z", String(TILE_ZOOM));
    url.searchParams.set("x", String(x));
    url.searchParams.set("y", String(y));
    if (period) {
      url.searchParams.set("from", period.from);
      url.searchParams.set("to", period.to);
    }

    const response = await fetch(url, {
      headers: {
        accept: "application/geo+json, application/json",
        "Ocp-Apim-Subscription-Key": apiKey
      },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`不動産情報ライブラリAPI ${endpoint} がHTTP ${response.status}を返しました。`);
    const body = await response.text();
    try {
      return JSON.parse(body) as { type?: string; features?: unknown[] };
    } catch {
      throw new Error(`不動産情報ライブラリAPI ${endpoint} の応答をGeoJSONとして解釈できませんでした。`);
    }
  }));

  const features = responses.flatMap((payload) => Array.isArray(payload.features) ? payload.features : []).filter(isFeature);
  return {
    type: "FeatureCollection" as const,
    features: dedupeFeatures(features).slice(0, 1800)
  };
}

function resolvePeriod(year: string | null, layerId: LibraryLayerId) {
  if (layerId !== "transaction-price" && layerId !== "past-transactions") return null;
  const numericYear = Number(year);
  const targetYear = Number.isInteger(numericYear) && numericYear >= 2005 ? numericYear : layerId === "past-transactions" ? 2024 : 2025;
  return { from: `${targetYear}1`, to: `${targetYear}4` };
}

function withMetadata(geoJson: unknown, layer: OpenDataLayerDefinition, source: "real-estate-library") {
  if (geoJson && typeof geoJson === "object") {
    return {
      ...(geoJson as Record<string, unknown>),
      metadata: {
        ...((geoJson as { metadata?: Record<string, unknown> }).metadata ?? {}),
        source,
        provider: "国土交通省 不動産情報ライブラリAPI",
        layer,
        fetchedAt: new Date().toISOString()
      }
    };
  }
  return geoJson;
}

function buildFallbackGeoJson(layer: OpenDataLayerDefinition, bounds: Bounds, reason: string, detail?: string) {
  const [south, west, north, east] = bounds;
  const latStep = (north - south) / 2;
  const lngStep = (east - west) / 2;
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;

  if (layer.id === "transaction-price" || layer.id === "past-transactions") {
    const features = Array.from({ length: 8 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 8;
      const lat = centerLat + Math.sin(angle) * (north - south) * 0.28;
      const lng = centerLng + Math.cos(angle) * (east - west) * 0.28;
      const price = layer.id === "past-transactions" ? 4200 + index * 680 : 5100 + index * 720;
      return {
        type: "Feature" as const,
        properties: {
          name: layer.id === "past-transactions" ? "過去取引プレビュー" : "不動産取引価格プレビュー",
          transaction_price: price * 10000,
          price,
          land_area: 92 + index * 8,
          transaction_period: layer.id === "past-transactions" ? "2024年" : "2025年",
          source: "preview"
        },
        geometry: { type: "Point" as const, coordinates: [lng, lat] }
      };
    });
    return fallbackCollection(layer, reason, detail, features);
  }

  if (layer.id === "development") {
    const features = [0.2, 0.45, 0.7, 0.82].map((ratio, index) => ({
      type: "Feature" as const,
      properties: {
        name: `開発情報プレビュー ${index + 1}`,
        development_status: index % 2 === 0 ? "確認済み" : "審査中",
        approval_date: `202${index + 2}-0${index + 3}-15`,
        source: "preview"
      },
      geometry: {
        type: "Point" as const,
        coordinates: [west + (east - west) * ratio, south + (north - south) * (0.28 + index * 0.16)]
      }
    }));
    return fallbackCollection(layer, reason, detail, features);
  }

  const features = Array.from({ length: 4 }, (_, index) => {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const cellSouth = south + latStep * row;
    const cellNorth = cellSouth + latStep;
    const cellWest = west + lngStep * column;
    const cellEast = cellWest + lngStep;
    return {
      type: "Feature" as const,
      properties: {
        name: layer.id === "building-regulation" ? `建築規制プレビュー ${index + 1}` : `用途地域プレビュー ${index + 1}`,
        CityPlanning: ["第一種低層住居専用地域", "第二種中高層住居専用地域", "近隣商業地域", "準工業地域"][index],
        coverage_ratio: [50, 60, 80, 60][index],
        floor_area_ratio: [80, 150, 300, 200][index],
        source: "preview"
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[
          [cellWest, cellSouth],
          [cellEast, cellSouth],
          [cellEast, cellNorth],
          [cellWest, cellNorth],
          [cellWest, cellSouth]
        ]]
      }
    };
  });
  return fallbackCollection(layer, reason, detail, features);
}

function fallbackCollection(layer: OpenDataLayerDefinition, reason: string, detail: string | undefined, features: unknown[]) {
  return {
    type: "FeatureCollection" as const,
    metadata: {
      source: "preview" as const,
      provider: "国土交通省 不動産情報ライブラリAPI（接続前プレビュー）",
      reason,
      detail,
      layer
    },
    features
  };
}

function getTiles(bounds: Bounds, zoom: number) {
  const [south, west, north, east] = bounds;
  const min = latLngToTile(south, west, zoom);
  const max = latLngToTile(north, east, zoom);
  const minX = Math.min(min.x, max.x);
  const maxX = Math.max(min.x, max.x);
  const minY = Math.min(min.y, max.y);
  const maxY = Math.max(min.y, max.y);
  const center = latLngToTile((south + north) / 2, (west + east) / 2, zoom);
  const tiles = [] as Array<{ x: number; y: number; distance: number }>;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      tiles.push({ x, y, distance: Math.abs(x - center.x) + Math.abs(y - center.y) });
    }
  }
  return tiles.sort((a, b) => a.distance - b.distance).slice(0, MAX_TILES);
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const scale = 2 ** zoom;
  const safeLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  return {
    x: Math.floor(((lng + 180) / 360) * scale),
    y: Math.floor((1 - Math.asinh(Math.tan((safeLat * Math.PI) / 180)) / Math.PI) / 2 * scale)
  };
}

function dedupeFeatures(features: GeoJsonFeature[]) {
  const seen = new Set<string>();
  return features.filter((feature) => {
    const key = JSON.stringify([feature.geometry, feature.properties]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type GeoJsonFeature = { type: "Feature"; geometry?: unknown; properties?: Record<string, unknown> };

function isFeature(value: unknown): value is GeoJsonFeature {
  return Boolean(value && typeof value === "object" && (value as { type?: string }).type === "Feature");
}

function resolveLibraryApiKey() {
  return [process.env.REAL_ESTATE_LIBRARY_API_KEY, process.env.MLIT_API_KEY]
    .map((value) => (value || "").trim().replace(/^['"]|['"]$/g, ""))
    .find(Boolean) ?? "";
}

function resolveLibraryBaseUrl() {
  return (process.env.REAL_ESTATE_LIBRARY_BASE_URL || DEFAULT_LIBRARY_BASE_URL).trim().replace(/\/$/u, "");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "不動産情報ライブラリAPIからデータを取得できませんでした。";
}

function parseBounds(value: string | null): Bounds | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east) return null;
  return [south, west, north, east];
}
