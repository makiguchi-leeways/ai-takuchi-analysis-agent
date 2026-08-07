# Architecture

## Current shape

- `MarketMapWorkspace` is the procurement-analysis application shell.
- `OpenDataMarketMap` owns viewport state, tile rendering, GeoJSON projection, lazy layer loading, and Feature hover/click interaction.
- `/api/open-data/geojson` is the server-side BFF for Gate API. API keys never enter the client bundle.
- `/api/map/transport` is the server-side OpenStreetMap Overpass adapter for railway lines and stations. It is independent of Gate API credentials.
- `src/lib/market/report.ts`, `scoring.ts`, and `finance.ts` keep the existing report, scoring, mortgage, and procurement calculations reusable.
- `/competition` and `/bids` are separate navigation screens. Their data is deliberately labelled as development sample data until formal adapters are connected.

## Information architecture

The primary screens are:

1. `仕入分析`: search header, layer sidebar, full map, candidate detail drawer, and procurement simulation.
2. `競合分析`: editable own KPI, TOP10 benchmark, competitor financial/area view, and news list.
3. `入札情報`: search/filter, listing, detail, bookmark/export slots, and navigation to procurement analysis.

The former `基本情報`, `周辺相場`, `建築未来図`, `ハザードマップ`, `統計情報`, and `周辺施設` tabs are removed. They are represented as map layers and detail-drawer sections.

## Data flow

```text
UI controls
  -> MarketMapWorkspace state
  -> OpenDataMarketMap
  -> /api/open-data/geojson (Gate BFF) or /api/map/transport (OSM Overpass)
  -> Gate API, OpenStreetMap, or explicit preview GeoJSON
```

Feature properties returned by the BFF are used for hover and click content. A missing property is rendered as `データなし`, never as numeric zero.

## Next adapter boundary

New external sources must be added behind server-side adapters/BFF routes. The browser should only receive normalized data:

- Gate API: market, property, and existing GeoJSON layers.
- Real Estate Information Library API: transaction price, land price, urban planning, and facilities.
- e-Stat / RESAS: population, households, income, age composition, and future estimates.
- National hazard and geospatial data: flood, landslide, liquefaction, cadastral, and school districts.
- Google Maps: optional map/satellite/Street View provider when `GOOGLE_MAPS_API_KEY` is available. OpenStreetMap standard tiles remain the development fallback.

## Performance rules

- Fetch only enabled layers for the current viewport.
- Do not request data during hover.
- Cancel stale layer requests when the viewport or enabled layers change.
- Cap rendered GeoJSON features per layer.
- Keep layer errors independent so one upstream failure does not blank the map.
