# ハウスメーカー向け市場分析レポート MVP

全国のハウスメーカー、戸建ビルダー、住宅事業者が「攻めるべき市区町村」と重点仕入れエリアを判断するための市場分析レポートWebアプリです。

## 想定ユーザー

- 経営企画担当
- 店舗開発担当
- 営業戦略担当
- 分譲住宅事業責任者
- 土地仕入れ担当者
- マーケティング担当者
- エリアマネージャー

## 主な機能

- 指定フォルダ内のデータ棚卸しと `src/data/data_catalog.json` 生成
- 横浜市青葉区周辺のサンプル分析データ
- 市区町村ランキング、町丁目ランキング
- 流動性 × 需給バランスの4象限チャート
- 地図タイル上の市場スコアピン表示
- Gate APIのGeoJSONオープンデータ重ね合わせ
- ブルーオーシャンTOP3
- 借入可能額、土地仕入れ上限価格、賃貸 vs 分譲比較
- 詳細レポート、エリア詳細、Appendixでの根拠表示
- ブラウザ印刷用CSS、CSV/Excel互換エクスポート
- API Routesによる分析・電卓API

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

起動後、`http://127.0.0.1:3000` を開きます。

## GitHub / Vercel 公開

このアプリは単体のNext.jsアプリとして公開できます。GitHubの新規リポジトリへpushしたあと、VercelでそのリポジトリをImportしてください。

```bash
git remote add origin https://github.com/<owner>/ai-takuchi-analysis-agent.git
git push -u origin main
```

VercelのProject Settingsでは、必要に応じて以下の環境変数を設定します。

```bash
GATE_API_KEY=...
GATE_API_BASE_URL=https://staging-api.gate.estate
```

`GATE_API_KEY` を設定しない場合も、プレビューGeoJSONで地図レイヤーの表示確認はできます。

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
GATE_API_BASE_URL=https://staging-api.gate.estate
```

`GATE_API_KEY` が未設定の場合、`/api/open-data/geojson` は画面検証用のプレビューGeoJSONを返します。指定フォルダ内の環境変数ファイルや資格情報らしいファイルは、内容を読まずメタデータのみを棚卸ししています。

## サンプルデータの使い方

現時点の分析結果は `src/lib/market/sampleData.ts` のサンプルデータを使用します。対象例は神奈川県横浜市青葉区、美しが丘1丁目、あざみ野2丁目、荏田北、たまプラーザ周辺です。

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

## 現時点の仮定

- 分析体験を優先し、市場分析値はサンプルデータです。
- 指定フォルダの実データは棚卸しまで完了し、分析ローダーへの接続は後続実装です。
- PDFは専用生成ではなく、ブラウザ印刷と印刷CSSで対応しています。
- Excel出力はMVPではExcelで開けるCSV形式です。
- 地図は外部タイルを使わないローカル表示の簡易商圏マップです。

## 今後の改善案

- `data_catalog.json` から `AreaMetric` へ変換する実データローダー追加
- 市区町村コード、町丁目コード、緯度経度の名寄せ処理
- SQLiteまたはDuckDBへのロード
- 実地図ライブラリの導入
- PDF専用レイアウト生成
- 過去レポート保存機能
- 欠損値補完ルールのUI編集
- シナリオ別感度分析
