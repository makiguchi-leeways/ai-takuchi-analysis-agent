# Market Scout

工務店が次に仕入れる土地を決めるためのAI宅地仕入・競合分析プラットフォームです。中心画面は「左レイヤー操作 | 地図 | 右詳細ドロワー」の仕入分析ワークスペースです。

## 想定ユーザー

- 経営企画担当
- 店舗開発担当
- 営業戦略担当
- 分譲住宅事業責任者
- 土地仕入れ担当者
- マーケティング担当者
- エリアマネージャー

## 主な機能

- 仕入分析: 市区町村・町丁目の需要、供給、需給ギャップ、仕入機会スコア、候補TOP10
- 地図レイヤー: Gate API GeoJSON、人口、地価、世帯年収、学区、用途地域、鉄道路線・駅の操作枠
- Feature hover / click: 実データ属性、出典、基準年、地域単位の表示
- 右詳細ドロワー: スコア内訳、需給、相場、人口、ハザード状態、仕入シミュレーション
- 仕入シミュレーション: 土地仕入上限、坪単価上限、粗利、安全余裕、販売価格感度
- 競合分析: 自社KPIとTOP10平均、競合財務・重点地域、ニュースの接続枠
- 入札情報: 自治体案件の検索、一覧、詳細、仕入分析への遷移枠
- ブラウザ印刷によるPDF出力
- 指定フォルダ内のデータ棚卸しと `src/data/data_catalog.json` 生成

## 技術スタック

- Next.js 15
- React 19
- TypeScript
- CSS ModulesではなくグローバルCSS
- Vitest
- Node.jsスクリプトによるデータ棚卸し

## セットアップ方法

```bash
npm install
```

## 起動方法

```bash
npm run dev
```

起動後、`http://127.0.0.1:3000` を開きます。主な画面は `/`（仕入分析）、`/competition`（競合分析）、`/bids`（入札情報）です。

## GitHub / Vercel 公開

このアプリは単体のNext.jsアプリとして公開できます。GitHubの新規リポジトリへpushしたあと、VercelでそのリポジトリをImportしてください。

```bash
git remote add origin https://github.com/<owner>/ai-takuchi-analysis-agent.git
git push -u origin main
```

VercelのProject Settingsでは、必要に応じて以下の環境変数を設定します。

```bash
GATE_API_KEY=...
# Optional compatibility alias for the provider's environment-variable name.
X_API_KEY=...
GATE_API_BASE_URL=https://enterprise-staging-api.gate.estate
REAL_ESTATE_LIBRARY_API_KEY=...
ESTAT_API_KEY=...
RESAS_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

`GATE_API_KEY` を設定しない場合も、プレビューGeoJSONで地図レイヤーの表示確認はできます。
通常は `GATE_API_KEY` を使用し、`X_API_KEY` は既存のVercel設定を移行する場合だけ使用してください。両方のValueにキー名や `=` は含めず、キー本体だけを設定します。

## データフォルダの指定方法

データ棚卸し対象は `DATA_CATALOG_ROOTS` にコロン区切りで指定します。

```bash
DATA_CATALOG_ROOTS="/path/to/open-data:/path/to/rent-appraisal-tool" node scripts/generate-data-catalog.mjs
```

環境変数が未設定の場合は空のカタログを生成します。


## 環境変数

基本機能は環境変数なしで動作します。Gate APIのオープンデータレイヤーを実データで表示する場合は、ローカルの `.env.local` に以下を設定します。

```bash
GATE_API_KEY=...
# Optional compatibility alias for the provider's environment-variable name.
X_API_KEY=...
GATE_API_BASE_URL=https://enterprise-staging-api.gate.estate
```

`GATE_API_KEY` が未設定の場合、`/api/open-data/geojson` は画面検証用のプレビューGeoJSONを返します。指定フォルダ内の環境変数ファイルや資格情報らしいファイルは、内容を読まずメタデータのみを棚卸ししています。

## サンプルデータの使い方

現時点の市区町村・町丁目分析は `src/lib/market/sampleData.ts` のサンプルデータを使用します。UIには「開発用サンプルデータ」と表示されます。Gate APIキーを設定すると、地図レイヤーはサーバー側BFF経由でGate APIへ接続します。

実データ連携では、`src/data/data_catalog.json` のカラムとキー候補をもとに `AreaMetric` へマッピングするローダーを追加してください。

## レポート生成手順

1. `/analyze` で分析条件を確認します。
2. 「分析実行」を押すと `/dashboard` に遷移します。
3. `/reports/sample-aoba-report` で詳細レポートを確認します。
4. 右上の印刷ボタンでPDF保存、CSV/Excel互換ボタンでデータ出力します。

## スコア算出ロジック

重みは `src/lib/market/weights.ts` にあります。

```text
総合スコア =
  流動性スコア × 0.25
+ 需要スコア × 0.25
+ 供給不足スコア × 0.20
+ 購買力スコア × 0.20
+ データ信頼度スコア × 0.10

ブルーオーシャンスコア =
  需要スコア × 0.35
+ 流動性スコア × 0.25
+ 供給不足スコア × 0.25
+ 購買力スコア × 0.15
- 競合過多ペナルティ
```

4象限は、流動性スコア55点以上、供給不足スコア55点以上を境界に分類します。

## 住宅ローン計算ロジック

元利均等返済で計算します。

```text
年間返済可能額 = 世帯年収 × 返済負担率
月間返済可能額 = 年間返済可能額 ÷ 12
借入可能額 = 月間返済可能額 × ((1 - (1 + 月利)^-返済月数) / 月利)
購入可能総額 = 借入可能額 + 自己資金
```

## 土地仕入れ上限価格計算ロジック

MVPでは、購入可能総額を販売価格上限とみなし、必要粗利を販売価格に対する率で計算します。

```text
必要粗利 = 購入可能総額 × 目標粗利率
土地仕入れ上限価格 =
  購入可能総額
- 建物原価
- 外構費
- 諸経費
- 販管費
- その他コスト
- 必要粗利
```

## データソース一覧

棚卸し結果は `src/data/data_catalog.json` に保存しています。MVPで確認済みの主要データは以下です。

- `人口データ.csv`
- `世帯.csv`
- `世帯年収平均.csv`
- `将来人口.csv`
- `物件データ(市区町村レベル).csv`
- `物件データ(町丁目レベル).csv`
- `公示地価.json`
- `基準地価.json`
- `用途地域.json`
- `小学校区.json`
- `中学校区.json`
- `賃料査定ツール` の既存Next.jsコードと分析ロジック

## API

- `GET /api/health`
- `GET /api/data-sources`
- `GET /api/areas`
- `GET /api/municipalities`
- `GET /api/neighborhoods`
- `POST /api/analyze`
- `GET /api/reports`
- `GET /api/reports/sample-aoba-report`
- `POST /api/reports/sample-aoba-report/export`
- `POST /api/calculators/borrowing-capacity`
- `POST /api/calculators/land-acquisition-limit`
- `POST /api/calculators/rent-vs-buy`

## テスト実行方法

```bash
npm test
npm run typecheck
npm run build
```

## 設計・対応状況

- 現行構成: `docs/architecture.md`
- データソースとAPI接続方針: `docs/data-sources.md`
- スコアと仕入上限計算: `docs/scoring.md`
- 競合分析の正式データ要件: `docs/competitor-analysis.md`
- 土地BANKベンチマークとの対応状況: `docs/benchmark-gap.md`

現在のサンプル分析と外部レイヤーのプレビューは、Production Dataと混同しないよう表示を分けています。正式データ連携では、API契約・利用条件・地理キー・基準日を確認した上で、サーバー側Adapter/BFFへ追加してください。

## 今後の改善案

- `data_catalog.json` から `AreaMetric` へ変換する実データローダー追加
- 市区町村コード、町丁目コード、緯度経度の名寄せ処理
- SQLiteまたはDuckDBへのロード
- 実地図ライブラリの導入
- PDF専用レイアウト生成
- 過去レポート保存機能
- 欠損値補完ルールのUI編集
- シナリオ別感度分析
