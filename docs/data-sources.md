# Data Sources

## Runtime mode

`DATA_SOURCE_MODE` is represented in the UI by the report's `sourceMode`. The current development report is `sample`; it is not presented as production data. External layer responses also include metadata with source, reason, upstream diagnostics, and layer definition.

## Connected / existing

| Source | Route or module | Current status | Notes |
| --- | --- | --- | --- |
| Gate API | `/api/open-data/geojson` | Partial | Server-side proxy. Requires `GATE_API_KEY` and the correct `GATE_API_BASE_URL`. |
| OpenStreetMap standard tiles | `OpenDataMarketMap` | Implemented | Detailed development basemap with railway and station labels. Attribution is shown. |
| OpenStreetMap Overpass | `/api/map/transport` | Implemented | Fetches rail lines and stations for the current map bounds. Falls back to clearly labelled preview geometry when unavailable. |
| Local sample AreaMetric | `src/lib/market/sampleData.ts` | Implemented | Clearly labelled as development sample data. |

## Adapter backlog

| Source | Intended data | Required next step |
| --- | --- | --- |
| 不動産情報ライブラリAPI | transactions, land price, urban planning | Confirm official endpoint, schema, rate limits, and credentials. Add server adapter and normalization tests. |
| e-Stat | small-area population, households, age, census | Confirm dataset IDs and geographic key mapping. |
| RESAS | regional and future population indicators | Confirm API key and municipality-code mapping. |
| 国土地理院 / ハザードマップ | flood, landslide, liquefaction, terrain | Select source datasets and normalize geometry/provenance. |
| EDINET | listed house-builder financials | Build company master and XBRL mapping with original-document links. |
| PR TIMES / Google News RSS | competitor news | Add scheduled server-side collection with source URLs and category mapping. |
| NJSS or public municipal feeds | bidding data | Confirm license/access terms before integration. |
| Google Maps | map, satellite, Street View | Add provider adapter only after API key, billing, and allowed usage are confirmed. |
