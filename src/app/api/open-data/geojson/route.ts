import { request as httpsRequest } from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { getOpenDataLayer, type OpenDataLayerDefinition } from "@/lib/market/openData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_GATE_API_BASE_URL = "https://staging-api.gate.estate";

type Bounds = [number, number, number, number];
type UpstreamDiagnostics = {
  status?: number;
  detail?: string;
  cause?: string;
  causeCode?: string;
  causeHostname?: string;
  host?: string;
  path?: string;
  dataName?: string;
  dataSourceYear?: string;
};
type GateApiResponse = {
  status: number;
  body: string;
};

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

  let upstreamUrl: URL | null = null;

  try {
    upstreamUrl = buildGateApiUrl(layer, bounds, searchParams.get("year"));
    const response = await requestGateApi(upstreamUrl, apiKey);

    if (response.status < 200 || response.status >= 300) {
      return NextResponse.json(
        buildFallbackGeoJson(layer, bounds, "gate-api-error", {
          status: response.status,
          detail: response.body.slice(0, 240),
          ...describeGateRequest(upstreamUrl, layer)
        })
      );
    }

    try {
      const geoJson = JSON.parse(response.body);
      return NextResponse.json(withMetadata(geoJson, layer, "gate-api"));
    } catch {
      return NextResponse.json(
        buildFallbackGeoJson(layer, bounds, "invalid-gate-api-json", describeGateRequest(upstreamUrl, layer))
      );
    }
  } catch (error) {
    return NextResponse.json(
      buildFallbackGeoJson(layer, bounds, "gate-api-request-failed", describeGateError(error, upstreamUrl, layer))
    );
  }
}

function buildGateApiUrl(layer: OpenDataLayerDefinition, bounds: Bounds, requestedYear: string | null) {
  const baseUrl = normalizeGateApiBaseUrl(process.env.GATE_API_BASE_URL);
  const endpoint = new URL("/ms-map-layer/v3/map/geojson", baseUrl);
  endpoint.searchParams.set("bounds", bounds.join(","));
  endpoint.searchParams.set("data_name", layer.dataName);
  endpoint.searchParams.set("data_source_year", requestedYear || layer.dataSourceYear);
  if (layer.rateUnitType) endpoint.searchParams.set("rate_unit_type", layer.rateUnitType);
  return endpoint;
}

function normalizeGateApiBaseUrl(value: string | undefined) {
  const raw = (value || DEFAULT_GATE_API_BASE_URL).trim().replace(/^GATE_API_BASE_URL\s*=\s*/, "");
  const originOnly = raw.replace(/\/ms-map-layer\/.*$/, "");
  return originOnly.endsWith("/") ? originOnly : `${originOnly}/`;
}

function requestGateApi(upstreamUrl: URL, apiKey: string) {
  if (upstreamUrl.protocol !== "https:") {
    throw new Error(`Unsupported Gate API protocol: ${upstreamUrl.protocol}`);
  }

  return new Promise<GateApiResponse>((resolve, reject) => {
    const request = httpsRequest(
      upstreamUrl.toString(),
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-api-key": apiKey
        },
        timeout: 15000
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Gate API request timed out."));
    });
    request.on("error", reject);
    request.end();
  });
}

function describeGateRequest(upstreamUrl: URL | null, layer: OpenDataLayerDefinition): UpstreamDiagnostics {
  return {
    host: upstreamUrl?.host,
    path: upstreamUrl?.pathname,
    dataName: layer.dataName,
    dataSourceYear: upstreamUrl?.searchParams.get("data_source_year") ?? layer.dataSourceYear
  };
}

function describeGateError(error: unknown, upstreamUrl: URL | null, layer: OpenDataLayerDefinition): UpstreamDiagnostics {
  const diagnostics: UpstreamDiagnostics = {
    detail: error instanceof Error ? error.message : "unknown error",
    ...describeGateRequest(upstreamUrl, layer)
  };

  if (error instanceof Error) {
    const errorRecord = error as Error & Record<string, unknown>;
    if (typeof errorRecord.code === "string") diagnostics.causeCode = errorRecord.code;
    if (typeof errorRecord.hostname === "string") diagnostics.causeHostname = errorRecord.hostname;
  }

  if (error instanceof Error && error.cause && typeof error.cause === "object") {
    const cause = error.cause as Record<string, unknown>;
    if (typeof cause.message === "string") diagnostics.cause = cause.message;
    if (typeof cause.code === "string") diagnostics.causeCode = cause.code;
    if (typeof cause.hostname === "string") diagnostics.causeHostname = cause.hostname;
  }

  return diagnostics;
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
  upstream?: UpstreamDiagnostics
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
