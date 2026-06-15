# GrowLink Web Site

GrowLinkのオンライン講座サービス用ランディングページです。
静的HTML/CSSで構成しているため、Vercelでは追加のサーバーやデータベースなしで公開できます。

## ファイル構成

- `index.html`: トップページ
- `message.html`: 代表メッセージページ
- `styles.css`: 共通スタイル
- `assets/`: ロゴ、講師写真、サイト内画像
- `scripts/build.mjs`: リンク切れや画像抜けの確認

## ローカル確認

```bash
npm run build
```

ローカルで表示確認する場合は以下を実行します。

```bash
npm run preview
```

ブラウザで `http://localhost:3000` を開いて確認できます。

## Vercel設定

Vercelにインポートする場合は、以下の設定でデプロイできます。

- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `.`
- Install Command: デフォルトのままで問題ありません

`vercel.json` に同じ設定を入れているため、通常はVercel側で自動的に認識されます。
404が出る場合は、VercelのProject SettingsでOutput Directoryが `.` になっているか確認してください。

## 環境変数

現在、このサイトに必要な環境変数はありません。

外部リンクはHTML内に直接設定しています。

- 相談フォーム: `https://forms.gle/ySTbn9mHUL7XbpNJA`
- 公式LINE: `https://lin.ee/yHAT2Rc`

将来、フォームURLやLINE URLを環境ごとに切り替えたい場合は、ビルド時にHTMLへ値を差し込む仕組みを追加してください。

## デプロイ前チェック

`npm run build` では以下を確認します。

- 公開に必要なHTML、CSS、画像ファイルが存在すること
- HTML内のローカル画像・CSSリンクが切れていないこと
- ページ内アンカーが存在すること
- 空の `href="#"` が残っていないこと
- 古い相談フォームURLが残っていないこと
