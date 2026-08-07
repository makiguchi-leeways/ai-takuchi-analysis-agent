"use client";

import Link from "next/link";
import { Layers, LocateFixed, Minus, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { quadrantLabel, quadrantTone, score } from "@/lib/market/format";
import {
  DEFAULT_OPEN_DATA_LAYER_IDS,
  OPEN_DATA_LAYERS,
  type OpenDataLayerDefinition
} from "@/lib/market/openData";
import type { RankedArea } from "@/lib/market/types";

const TILE_SIZE = 256;
const MIN_ZOOM = 9;
const MAX_ZOOM = 15;
const DEFAULT_MAP_SIZE = { width: 760, height: 420 };
const MAX_RENDERED_FEATURES_PER_LAYER = 700;
const LAYER_CACHE = new Map<string, GeoJsonFeatureCollection>();

type LatLng = {
  lat: number;
  lng: number;
};

type MapSize = {
  width: number;
  height: number;
};

type MapView = {
  center: LatLng;
  zoom: number;
};

type Tile = {
  key: string;
  src: string;
  left: number;
  top: number;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
  metadata?: {
    source?: "gate-api" | "sample" | "preview" | "real-estate-library" | "openstreetmap";
    reason?: string;
    upstream?: {
      status?: number;
      detail?: string;
    };
    layer?: OpenDataLayerDefinition;
  };
};

type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: GeoJsonGeometry | null;
};

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

type Position = [number, number, ...number[]];

type DragState = {
  pointerId: number;
  clientX: number;
  clientY: number;
  centerWorld: { x: number; y: number };
};

type FeatureInfoRow = {
  label: string;
  value: string;
};

type FeatureInfoState = {
  layerLabel: string;
  color: string;
  title: string;
  rows: FeatureInfoRow[];
  x: number;
  y: number;
  pinned: boolean;
};

export interface MapFeatureSelection {
  layer: OpenDataLayerDefinition;
  title: string;
  rows: FeatureInfoRow[];
  properties: Record<string, unknown>;
  source: "gate-api" | "sample" | "preview" | "real-estate-library" | "openstreetmap" | "unknown";
}

interface OpenDataMarketMapProps {
  areas: RankedArea[];
  enabledLayerIds?: string[];
  onEnabledLayerIdsChange?: (layerIds: string[]) => void;
  onFeatureSelect?: (selection: MapFeatureSelection) => void;
  onAreaSelect?: (area: RankedArea) => void;
  onLayerStatusChange?: (statuses: Record<string, "待機" | "読込中" | "読込済" | "プレビュー" | "エラー" | "データなし">) => void;
}

type FeatureInteractionHandlers = {
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerEnter: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerLeave: () => void;
  onPointerUp: (event: ReactPointerEvent<SVGElement>) => void;
};

const LIBRARY_LAYER_IDS = new Set(["transaction-price", "past-transactions", "use-district", "building-regulation", "development"]);

export function OpenDataMarketMap({
  areas,
  enabledLayerIds: controlledLayerIds,
  onEnabledLayerIdsChange,
  onFeatureSelect,
  onAreaSelect,
  onLayerStatusChange
}: OpenDataMarketMapProps) {
  const initialView = useMemo(() => resolveInitialView(areas), [areas]);
  const [center, setCenter] = useState(initialView.center);
  const [zoom, setZoom] = useState(initialView.zoom);
  const [size, setSize] = useState(DEFAULT_MAP_SIZE);
  const [internalLayerIds, setInternalLayerIds] = useState<string[]>(DEFAULT_OPEN_DATA_LAYER_IDS);
  const [collections, setCollections] = useState<Record<string, GeoJsonFeatureCollection>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [featureInfo, setFeatureInfo] = useState<FeatureInfoState | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const view = useMemo<MapView>(() => ({ center, zoom }), [center, zoom]);
  const tiles = useMemo(() => getVisibleTiles(view, size), [view, size]);
  const boundsParam = useMemo(() => formatBounds(getViewportBounds(view, size)), [view, size]);
  const enabledLayerIds = controlledLayerIds ?? internalLayerIds;
  const enabledLayers = OPEN_DATA_LAYERS.filter((layer) => enabledLayerIds.includes(layer.id));
  const fallbackLayers = enabledLayers.filter((layer) => {
    const source = collections[layer.id]?.metadata?.source;
    return source === "sample" || source === "preview";
  });
  const missingApiKeyActive = fallbackLayers.some((layer) => collections[layer.id]?.metadata?.reason === "missing-api-key");
  const transportFallbackActive = fallbackLayers.some((layer) => layer.id === "transport");

  useEffect(() => {
    setCenter(initialView.center);
    setZoom(initialView.zoom);
    setFeatureInfo(null);
  }, [initialView]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, Math.round(entry.contentRect.width)),
        height: Math.max(320, Math.round(entry.contentRect.height))
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (enabledLayerIds.length === 0) {
      setErrorMessage(null);
      setLoading(false);
      onLayerStatusChange?.({});
      return;
    }

    let canceled = false;
    const controller = new AbortController();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    if (refreshToken > 0) {
      enabledLayerIds.forEach((layerId) => LAYER_CACHE.delete(`${layerId}:${boundsParam}`));
    }
    setLoading(true);
    setErrorMessage(null);
    onLayerStatusChange?.(Object.fromEntries(enabledLayerIds.map((layerId) => [layerId, "読込中"])));

    debounceTimer = setTimeout(() => {
      Promise.all(
        enabledLayerIds.map(async (layerId) => {
          const cacheKey = `${layerId}:${boundsParam}`;
          const cached = LAYER_CACHE.get(cacheKey);
          if (cached) return { layerId, payload: cached };
          const params = new URLSearchParams({ layer: layerId, bounds: boundsParam });
          try {
            const endpoint = layerId === "transport"
              ? `/api/map/transport?${params.toString()}`
              : LIBRARY_LAYER_IDS.has(layerId)
                ? `/api/open-data/library?${params.toString()}`
                : `/api/open-data/geojson?${params.toString()}`;
            const response = await fetch(endpoint, {
              cache: "no-store",
              signal: controller.signal
            });
            const payload = await response.json();
            if (!response.ok) {
              throw new Error(payload.error ?? `${layerId} could not be loaded.`);
            }
            const collection = payload as GeoJsonFeatureCollection;
            LAYER_CACHE.set(cacheKey, collection);
            return { layerId, payload: collection };
          } catch (error) {
            if (controller.signal.aborted) throw error;
            return {
              layerId,
              error: error instanceof Error ? error.message : "取得に失敗しました。"
            };
          }
        })
      )
        .then((results) => {
        if (canceled) return;
        const succeeded = results.filter((result): result is { layerId: string; payload: GeoJsonFeatureCollection } => "payload" in result);
        const failed = results.filter((result): result is { layerId: string; error: string } => "error" in result);

        setCollections((current) => ({
          ...current,
          ...Object.fromEntries(succeeded.map((result) => [result.layerId, result.payload]))
        }));

        onLayerStatusChange?.(Object.fromEntries(
          results.map((result) => {
            if ("error" in result) return [result.layerId, "エラー"];
            if (result.payload.features.length === 0) return [result.layerId, "データなし"];
            if (result.payload.metadata?.source === "sample" || result.payload.metadata?.source === "preview") {
              return [result.layerId, "プレビュー"];
            }
            return [result.layerId, "読込済"];
          })
        ));

        setErrorMessage(
          failed.length > 0
            ? `取得できないレイヤー: ${failed.map((result) => getOpenDataLayerLabel(result.layerId)).join("、")}`
            : null
        );
        })
        .catch((error) => {
          if (canceled || controller.signal.aborted) return;
          setErrorMessage(error instanceof Error ? error.message : "オープンデータの取得に失敗しました。");
        })
        .finally(() => {
          if (!canceled) setLoading(false);
        });
    }, 180);

    return () => {
      canceled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [boundsParam, enabledLayerIds, refreshToken]);

  function toggleLayer(layerId: string) {
    const nextLayerIds = enabledLayerIds.includes(layerId)
      ? enabledLayerIds.filter((id) => id !== layerId)
      : [...enabledLayerIds, layerId];
    if (controlledLayerIds === undefined) setInternalLayerIds(nextLayerIds);
    onEnabledLayerIdsChange?.(nextLayerIds);
  }

  function recenter() {
    setCenter(initialView.center);
    setZoom(initialView.zoom);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a,button")) return;
    setFeatureInfo(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      centerWorld: latLngToWorld(center, zoom)
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.clientX;
    const dy = event.clientY - dragState.clientY;
    setCenter(worldToLatLng(dragState.centerWorld.x - dx, dragState.centerWorld.y - dy, zoom));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState?.pointerId === event.pointerId) {
      setDragState(null);
    }
  }

  function showFeatureInfo(feature: GeoJsonFeature, layer: OpenDataLayerDefinition, event: ReactPointerEvent<SVGElement>, pinned: boolean) {
    event.stopPropagation();
    const point = tooltipPosition(event);
    const info = buildFeatureInfo(feature, layer);
    if (pinned) {
      onFeatureSelect?.({
        layer,
        title: info.title,
        rows: info.rows,
        properties: feature.properties ?? {},
        source: collections[layer.id]?.metadata?.source ?? "unknown"
      });
    }
    setFeatureInfo({
      ...info,
      ...point,
      pinned
    });
  }

  function moveFeatureInfo(event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation();
    setFeatureInfo((current) => {
      if (!current || current.pinned) return current;
      return {
        ...current,
        ...tooltipPosition(event)
      };
    });
  }

  function hideFeatureInfo() {
    setFeatureInfo((current) => (current?.pinned ? current : null));
  }

  function tooltipPosition(event: ReactPointerEvent<SVGElement>) {
    const rect = mapRef.current?.getBoundingClientRect();
    const rawX = rect ? event.clientX - rect.left + 14 : 16;
    const rawY = rect ? event.clientY - rect.top + 14 : 16;
    return {
      x: Math.max(10, Math.min(rawX, size.width - 290)),
      y: Math.max(10, Math.min(rawY, size.height - 190))
    };
  }

  function featureHandlers(feature: GeoJsonFeature, layer: OpenDataLayerDefinition): FeatureInteractionHandlers {
    return {
      onPointerDown: (event) => event.stopPropagation(),
      onPointerEnter: (event) => showFeatureInfo(feature, layer, event, false),
      onPointerMove: moveFeatureInfo,
      onPointerLeave: hideFeatureInfo,
      onPointerUp: (event) => showFeatureInfo(feature, layer, event, true)
    };
  }

  return (
    <div className="open-data-map-shell">
      <div className="map-control-bar">
        <div className="layer-toggle-group" aria-label="オープンデータレイヤー">
          <span className="layer-group-label">
            <Layers size={16} />
            レイヤー
          </span>
          {controlledLayerIds === undefined
            ? OPEN_DATA_LAYERS.map((layer) => {
                const active = enabledLayerIds.includes(layer.id);
                return (
                  <button
                    aria-pressed={active}
                    className={`layer-chip${active ? " active" : ""}`}
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    style={{ "--layer-color": layer.color } as CSSProperties}
                    title={`${layer.label}を${active ? "非表示" : "表示"}`}
                    type="button"
                  >
                    <span className="layer-swatch" />
                    {layer.label}
                  </button>
                );
              })
            : <span className="map-control-hint">左サイドバーで表示レイヤーを選択</span>}
        </div>
        <div className="map-tool-buttons">
          <button aria-label="地図を初期位置へ戻す" onClick={recenter} title="初期位置" type="button">
            <LocateFixed size={16} />
          </button>
          <button aria-label="レイヤーを再読み込み" onClick={() => setRefreshToken((value) => value + 1)} title="再読み込み" type="button">
            <RefreshCw size={16} />
          </button>
          <button aria-label="縮小" onClick={() => setZoom((value) => clampZoom(value - 1))} title="縮小" type="button">
            <Minus size={16} />
          </button>
          <button aria-label="拡大" onClick={() => setZoom((value) => clampZoom(value + 1))} title="拡大" type="button">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div
        aria-label="市場分析地図"
        className={`tile-map${dragState ? " dragging" : ""}`}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        ref={mapRef}
      >
        <div className="tile-layer" aria-hidden="true">
          {tiles.map((tile) => (
            <img
              alt=""
              className="map-tile"
              draggable={false}
              key={tile.key}
              src={tile.src}
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
        </div>

        <svg className="geojson-overlay" role="presentation" viewBox={`0 0 ${size.width} ${size.height}`}>
          {enabledLayers.map((layer) =>
            (collections[layer.id]?.features ?? []).slice(0, MAX_RENDERED_FEATURES_PER_LAYER).map((feature, index) =>
              renderFeature(feature, layer, `${layer.id}-${index}`, view, size, featureHandlers(feature, layer))
            )
          )}
        </svg>

        {featureInfo ? (
          <div
            className={`geo-feature-popover${featureInfo.pinned ? " pinned" : ""}`}
            style={{ left: featureInfo.x, top: featureInfo.y, "--layer-color": featureInfo.color } as CSSProperties}
          >
            <div className="geo-feature-popover-head">
              <span>{featureInfo.layerLabel}</span>
              {featureInfo.pinned ? (
                <button aria-label="情報を閉じる" onClick={() => setFeatureInfo(null)} type="button">
                  ×
                </button>
              ) : null}
            </div>
            <strong>{featureInfo.title}</strong>
            <dl>
              {featureInfo.rows.map((row) => (
                <div key={`${row.label}-${row.value}`}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <div className="geo-map-pin-layer">
          {areas.slice(0, 14).map((item) => {
            const point = projectLatLng({ lat: item.area.lat, lng: item.area.lng }, view, size);
            if (point.x < -40 || point.y < -40 || point.x > size.width + 40 || point.y > size.height + 40) return null;

            return (
              onAreaSelect ? (
                <button
                  aria-label={`${item.area.neighborhood}の詳細を開く`}
                  className={`geo-map-pin ${quadrantTone(item.quadrant)}`}
                  key={item.area.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAreaSelect(item);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={{ left: point.x, top: point.y }}
                  title={`${item.area.municipality} ${item.area.neighborhood}: 総合${score(item.overallScore)} / ${quadrantLabel(item.quadrant)}`}
                  type="button"
                >
                  {item.rank}
                </button>
              ) : (
                <Link
                  className={`geo-map-pin ${quadrantTone(item.quadrant)}`}
                  href={`/areas/${item.area.id}`}
                  key={item.area.id}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={{ left: point.x, top: point.y }}
                  title={`${item.area.municipality} ${item.area.neighborhood}: 総合${score(item.overallScore)} / ${quadrantLabel(item.quadrant)}`}
                >
                  {item.rank}
                </Link>
              )
            );
          })}
        </div>

        <div className="map-attribution">
          © OpenStreetMap contributors
        </div>
      </div>

      <div className="map-status-row">
        <span>{loading ? "レイヤー読込中" : `${enabledLayerIds.length}件のレイヤーを表示`}</span>
        {fallbackLayers.length > 0 ? (
          <span className="map-warning">
            {missingApiKeyActive
              ? "Gate API未接続のためプレビューGeoJSONを表示しています"
              : transportFallbackActive
                ? "路線・駅データはプレビュー表示中です"
                : `外部API未取得のためプレビュー表示中: ${fallbackLayers.map((layer) => layer.label).join("、")}`}
          </span>
        ) : null}
        {errorMessage ? <span className="map-error">{errorMessage}</span> : null}
      </div>
    </div>
  );
}

function resolveInitialView(areas: RankedArea[]): MapView {
  const latitudes = areas.map((item) => item.area.lat);
  const longitudes = areas.map((item) => item.area.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const span = Math.max(maxLat - minLat, maxLng - minLng);

  return {
    center: {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2
    },
    zoom: span < 0.05 ? 13 : span < 0.12 ? 12 : span < 0.24 ? 11 : 10
  };
}

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function getVisibleTiles(view: MapView, size: MapSize): Tile[] {
  const scale = 2 ** view.zoom;
  const centerWorld = latLngToWorld(view.center, view.zoom);
  const minX = Math.floor((centerWorld.x - size.width / 2) / TILE_SIZE) - 1;
  const maxX = Math.floor((centerWorld.x + size.width / 2) / TILE_SIZE) + 1;
  const minY = Math.floor((centerWorld.y - size.height / 2) / TILE_SIZE) - 1;
  const maxY = Math.floor((centerWorld.y + size.height / 2) / TILE_SIZE) + 1;
  const tiles: Tile[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (y < 0 || y >= scale) continue;
      const wrappedX = ((x % scale) + scale) % scale;
      tiles.push({
        key: `${view.zoom}-${x}-${y}`,
        src: `https://tile.openstreetmap.org/${view.zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - (centerWorld.x - size.width / 2),
        top: y * TILE_SIZE - (centerWorld.y - size.height / 2)
      });
    }
  }

  return tiles;
}

function getViewportBounds(view: MapView, size: MapSize): [number, number, number, number] {
  const southwest = screenToLatLng({ x: 0, y: size.height }, view, size);
  const northeast = screenToLatLng({ x: size.width, y: 0 }, view, size);
  return [southwest.lat, southwest.lng, northeast.lat, northeast.lng];
}

function formatBounds(bounds: [number, number, number, number]) {
  return bounds.map((value) => value.toFixed(6)).join(",");
}

function latLngToWorld(point: LatLng, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sinLat = Math.sin((Math.max(-85.05113, Math.min(85.05113, point.lat)) * Math.PI) / 180);
  return {
    x: ((point.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function worldToLatLng(x: number, y: number, zoom: number): LatLng {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function projectLatLng(point: LatLng, view: MapView, size: MapSize) {
  const world = latLngToWorld(point, view.zoom);
  const centerWorld = latLngToWorld(view.center, view.zoom);
  return {
    x: size.width / 2 + world.x - centerWorld.x,
    y: size.height / 2 + world.y - centerWorld.y
  };
}

function screenToLatLng(point: { x: number; y: number }, view: MapView, size: MapSize) {
  const centerWorld = latLngToWorld(view.center, view.zoom);
  return worldToLatLng(
    centerWorld.x + point.x - size.width / 2,
    centerWorld.y + point.y - size.height / 2,
    view.zoom
  );
}

function renderFeature(
  feature: GeoJsonFeature,
  layer: OpenDataLayerDefinition,
  key: string,
  view: MapView,
  size: MapSize,
  handlers: FeatureInteractionHandlers
) {
  if (!feature.geometry) return null;
  const commonStyle: CSSProperties = {
    fill: layer.color,
    fillOpacity: layer.fillOpacity,
    stroke: layer.color,
    strokeOpacity: layer.strokeOpacity
  };
  const title = formatFeatureTitle(feature, layer);

  if (layer.id === "transport") {
    return renderTransportFeature(feature, key, view, size, handlers, title);
  }

  if (feature.geometry.type === "Polygon") {
    const path = polygonPath(feature.geometry.coordinates, view, size);
    if (!path) return null;
    return (
      <path className="geojson-feature" d={path} fillRule="evenodd" key={key} style={commonStyle} {...handlers}>
        <title>{title}</title>
      </path>
    );
  }

  if (feature.geometry.type === "MultiPolygon" && Array.isArray(feature.geometry.coordinates)) {
    const path = feature.geometry.coordinates.map((polygon) => polygonPath(polygon, view, size)).filter(Boolean).join(" ");
    if (!path) return null;
    return (
      <path className="geojson-feature" d={path} fillRule="evenodd" key={key} style={commonStyle} {...handlers}>
        <title>{title}</title>
      </path>
    );
  }

  if (feature.geometry.type === "LineString") {
    const path = linePath(feature.geometry.coordinates, view, size);
    if (!path) return null;
    return (
      <path className="geojson-feature-line" d={path} fill="none" key={key} style={commonStyle} {...handlers}>
        <title>{title}</title>
      </path>
    );
  }

  if (feature.geometry.type === "MultiLineString" && Array.isArray(feature.geometry.coordinates)) {
    const path = feature.geometry.coordinates.map((line) => linePath(line, view, size)).filter(Boolean).join(" ");
    if (!path) return null;
    return (
      <path className="geojson-feature-line" d={path} fill="none" key={key} style={commonStyle} {...handlers}>
        <title>{title}</title>
      </path>
    );
  }

  if (feature.geometry.type === "Point" && isPosition(feature.geometry.coordinates)) {
    const point = projectLatLng({ lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] }, view, size);
    return (
      <circle className="geojson-feature-point" cx={point.x} cy={point.y} key={key} r={5} style={commonStyle} {...handlers}>
        <title>{title}</title>
      </circle>
    );
  }

  return null;
}

function renderTransportFeature(
  feature: GeoJsonFeature,
  key: string,
  view: MapView,
  size: MapSize,
  handlers: FeatureInteractionHandlers,
  title: string
) {
  if (!feature.geometry) return null;
  const properties = feature.properties ?? {};
  const railway = firstString(properties, ["railway", "type"]);

  if (feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString") {
    const path = feature.geometry.type === "LineString"
      ? linePath(feature.geometry.coordinates, view, size)
      : Array.isArray(feature.geometry.coordinates)
        ? feature.geometry.coordinates.map((line) => linePath(line, view, size)).filter(Boolean).join(" ")
        : "";
    if (!path) return null;
    return (
      <path
        className="geojson-transport-line"
        d={path}
        fill="none"
        key={key}
        {...handlers}
      >
        <title>{title}</title>
      </path>
    );
  }

  if (feature.geometry.type === "Point" && isPosition(feature.geometry.coordinates)) {
    const point = projectLatLng({ lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] }, view, size);
    const stationName = firstString(properties, ["name", "Name"]);
    return (
      <g className="geojson-transport-station" key={key} {...handlers}>
        <circle cx={point.x} cy={point.y} r={railway === "subway_entrance" ? 4 : 6} />
        {stationName ? <text className="transport-station-label" x={point.x + 9} y={point.y - 8}>{stationName}</text> : null}
        <title>{title}</title>
      </g>
    );
  }

  return null;
}

function polygonPath(coordinates: unknown, view: MapView, size: MapSize) {
  if (!Array.isArray(coordinates)) return "";
  return coordinates.map((ring) => `${linePath(ring, view, size)} Z`).filter((path) => path.length > 2).join(" ");
}

function linePath(coordinates: unknown, view: MapView, size: MapSize) {
  if (!Array.isArray(coordinates)) return "";
  return coordinates
    .filter(isPosition)
    .map((position, index) => {
      const point = projectLatLng({ lat: position[1], lng: position[0] }, view, size);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number";
}

function formatFeatureTitle(feature: GeoJsonFeature, layer: OpenDataLayerDefinition) {
  const properties = feature.properties ?? {};
  const name = firstString(properties, ["address", "name", "Name", "label", "area_name", "city_name", "characteristics"]) ?? layer.label;
  const value = layerStatistic(properties, layer);
  return value ? `${name} / ${value}` : name;
}

function buildFeatureInfo(feature: GeoJsonFeature, layer: OpenDataLayerDefinition) {
  const properties = feature.properties ?? {};
  const address = firstString(properties, ["address", "name", "Name", "label", "area_name", "city_name"]);
  const characteristic = firstString(properties, ["characteristics", "CityPlanning", "city_planning", "zoning", "development_status"]);
  const description = firstString(properties, ["descriptions", "description", "transaction_period", "Period"]);
  const statistic = layerStatistic(properties, layer);
  const rows: FeatureInfoRow[] = [];

  if (statistic) rows.push({ label: metricLabel(layer), value: statistic });
  if (characteristic) rows.push({ label: layer.category === "school" ? "学校名" : "区分", value: characteristic });
  if (description) rows.push({ label: layer.category === "zoning" ? "建ぺい率 / 容積率" : "詳細", value: description });
  if (address) rows.push({ label: layer.category === "school" ? "所在地" : "エリア", value: address });

  const additionalValues = numericEntries(properties)
    .filter((entry) => !isSameNumericValue(entry, properties))
    .slice(0, 3);
  additionalValues.forEach((entry) => {
    rows.push({ label: propertyLabel(entry.key), value: formatLayerNumber(entry.value, layer, entry.key) });
  });

  if (rows.length === 0) rows.push({ label: "属性", value: "表示できる属性値がありません" });

  return {
    layerLabel: layer.label,
    color: layer.color,
    title: characteristic ?? address ?? layer.label,
    rows
  };
}

function metricLabel(layer: OpenDataLayerDefinition) {
  if (layer.id === "land-price") return "地価公示";
  if (layer.id === "population-density") return "人口密度";
  if (layer.id === "household-income") return "世帯年収";
  if (layer.id === "rent-mean") return "賃料平均";
  if (layer.id === "gross-rate") return "キャップレート";
  if (layer.id === "household-change") return "家族世帯割合";
  if (layer.id === "future-population") return "将来人口";
  if (layer.id === "transaction-price") return "取引価格";
  if (layer.id === "past-transactions") return "過去取引価格";
  if (layer.id === "use-district" || layer.id === "building-regulation") return "建蔽率";
  return "統計値";
}

function layerStatistic(properties: Record<string, unknown>, layer: OpenDataLayerDefinition) {
  const entry = findNumericEntry(properties);
  if (entry) return formatLayerNumber(entry.value, layer, entry.key);
  const text = firstString(properties, ["statistics", "value", "mean", "data_value", "price", "rate"]);
  return text ?? null;
}

type NumericEntry = { key: string; value: number };

const PREFERRED_NUMERIC_KEYS = [
  "statistics",
  "value",
  "mean",
  "average",
  "avg",
  "data_value",
  "dataValue",
  "population_density",
  "total_population",
  "total_population_future",
  "household_income_mean",
  "family_household_ratio",
  "single_household_ratio",
  "total_selling_price_mean",
  "transaction_price",
  "selling_price",
  "sale_price",
  "price",
  "rate",
  "coverage_ratio",
  "floor_area_ratio",
  "CoverageRatio",
  "FloorAreaRatio"
];

function findNumericEntry(properties: Record<string, unknown>) {
  for (const key of PREFERRED_NUMERIC_KEYS) {
    const value = numericValue(properties[key]);
    if (value !== null) return { key, value };
  }
  return numericEntries(properties)[0] ?? null;
}

function numericEntries(properties: Record<string, unknown>) {
  return Object.entries(properties)
    .filter(([key]) => !isCoordinateKey(key))
    .map(([key, value]) => {
      const numeric = numericValue(value);
      return numeric === null ? null : { key, value: numeric };
    })
    .filter((entry): entry is NumericEntry => entry !== null);
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.replaceAll(",", "").trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:%|円|万円|人|世帯|㎡|m2|m²)?$/.test(normalized)) return null;
  const parsed = Number(normalized.replace(/(?:%|円|万円|人|世帯|㎡|m2|m²)$/u, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatLayerNumber(value: number, layer: OpenDataLayerDefinition, key: string) {
  if (layer.id === "gross-rate" || /ratio|rate|growth|増減/u.test(key)) {
    const percentValue = layer.id === "gross-rate" && value <= 1 ? value * 100 : value;
    return `${percentValue.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}%`;
  }
  if (layer.id === "population-density" || layer.id === "future-population" || /population|household_count/u.test(key)) {
    return `${Math.round(value).toLocaleString("ja-JP")}人`;
  }
  if (layer.id === "household-income" || /income/u.test(key)) return `${Math.round(value).toLocaleString("ja-JP")}万円`;
  if (layer.id === "land-price") return `${Math.round(value).toLocaleString("ja-JP")}円/㎡`;
  if (layer.id === "rent-mean") return `${Math.round(value).toLocaleString("ja-JP")}円`;
  if (layer.id === "transaction-price" || layer.id === "past-transactions" || /price|Price/u.test(key)) {
    const manYen = value >= 10000 ? value / 10000 : value;
    return `${Math.round(manYen).toLocaleString("ja-JP")}万円`;
  }
  if (/coverage|Coverage/u.test(key)) return `${value.toLocaleString("ja-JP")}％`;
  if (/floor|Floor/u.test(key)) return `${value.toLocaleString("ja-JP")}％`;
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function isSameNumericValue(entry: NumericEntry, properties: Record<string, unknown>) {
  const statisticEntry = findNumericEntry(properties);
  return statisticEntry?.key === entry.key && statisticEntry.value === entry.value;
}

function propertyLabel(key: string) {
  const labels: Record<string, string> = {
    family_household_ratio: "家族世帯割合",
    single_household_ratio: "単身世帯割合",
    total_population_future: "将来人口",
    transaction_price: "取引価格",
    land_area: "土地面積",
    coverage_ratio: "建蔽率",
    floor_area_ratio: "容積率",
    CoverageRatio: "建蔽率",
    FloorAreaRatio: "容積率"
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function firstString(properties: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function isCoordinateKey(key: string) {
  return /^(lat|lng|lon|latitude|longitude|x|y|id|code)$/i.test(key);
}

function getOpenDataLayerLabel(layerId: string) {
  return OPEN_DATA_LAYERS.find((layer) => layer.id === layerId)?.label ?? layerId;
}
