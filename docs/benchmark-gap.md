# 土地BANK Benchmark Gap

The benchmark page describes a map-based workflow with one-click property/map data, past five-year property history, school districts, hazard overlays, statistics, measurement, cadastral data, and notes. The checklist below records the current state of this repository.

| Feature | Current Status | Implementation | Data Source | Remaining Issue |
| --- | --- | --- | --- | --- |
| 物件検索・土地表示 | Partial | 仕入分析検索ヘッダー、地図 | Sample / Gate slot | Production property adapter |
| 戸建・マンション・その他表示 | Blocked | Not yet modelled | Requires licensed listing source | Confirm source and schema |
| 金額・面積・築年数絞り込み | Partial | Price cap field exists | Sample report | Add property filter fields |
| 過去事例・地価公示・坪単価 | Partial | Gate layer and drawer | Gate API | Transaction adapter and history series |
| 地価過去推移グラフ | Blocked | Not yet rendered | Real Estate Information Library | Confirm time-series endpoint |
| 用途地域・建築条件 | Partial | Layer controls and no-data drawer state | Gate / official data slots | Connect official geometry |
| 町域・町名・人口・世帯・国勢調査 | Partial | AreaMetric ranking and drawer | Sample / e-Stat slot | Geographic key mapping |
| 将来世帯・核家族・高齢単身・高齢夫婦 | Blocked | Layer controls only | e-Stat / RESAS | Dataset mapping |
| 小学校区・中学校区 | Partial | Gate small-school layer and controls | Gate / official data | Fix/confirm national school-district source |
| 交通・バス停・バス運行情報 | Blocked | Layer controls only | National geospatial / transit APIs | Confirm feeds |
| 測量・半径検索・徒歩圏 | Partial | Layer controls only | Market Scout tool slot | Add map interaction geometry |
| 公図・地番・筆ポリゴン | Blocked | Layer controls only | Official cadastral data | License and geometry integration |
| Map / Satellite / Street View | Partial | CARTO/OSM development basemap | CARTO / OSM | Add Google Maps provider after key and usage confirmation |
| 河川浸水・低位地帯・津波・土砂・活断層・地震 | Partial | Hazard controls and explicit no-data drawer | Official hazard sources | Connect each layer and provenance |
| メモ・注意地点 | Partial | Layer control and future slot | Internal data | Persist records and permissions |
| ローン試算 | Implemented | Existing finance module and API | Calculation | Add to drawer as a second calculator panel |
| 仕入機会スコア・TOP10 | Implemented | Scored ranking, legend, drawer breakdown | AreaMetric | Replace sample AreaMetric with production adapter |
| 競合KPI・決算・ニュース | Partial | `/competition` screen and source slots | Sample / EDINET / RSS slots | Production ingestion and scheduler |
| 入札検索・詳細・仕入分析遷移 | Partial | `/bids` screen with filters and detail | Sample public listings | Confirm NJSS/public feeds and persist bookmarks |
