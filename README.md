# Hobipedia

アニメ・特撮・キャラクターグッズの網羅的な相場・コレクションウィキ。

公開URL: https://hobipedia.jp（準備中）

## ポジショニング

- スニダン型のWeb+アプリ両軸（Webは本リポジトリ・アプリは別途Expo `catalog-app`）
- Wiki式ユーザー書き込み（want/watch/own + 投稿・編集）
- 初動はAIでデータ集め（駿河屋カタログ + メルカリsold + Gemini画像照合）

## 技術スタック

- Next.js 16 (App Router) + React 19
- TypeScript + Tailwind CSS v4
- Prisma + PostgreSQL (Neon)
- Cloudflare R2（画像ストレージ）
- Vercel（ホスティング、リージョン: hnd1）

## 開発

```bash
npm install
npm run dev
```

http://localhost:3000

## 関連リポジトリ

- データ収集パイプライン: `ai-skills/sedori-research-app/`（駿河屋スクレイプ + メルカリsold + Gemini照合）
- アプリ版（Expo Web/iOS/Android）: `ai-skills/sedori-research-app/catalog-app/`
- 詳細構想: `ai-skills/anime-goods-wiki-concept.md` / `ai-skills/hobby-wiki-platform.md`
