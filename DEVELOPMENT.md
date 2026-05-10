# Oshi-Link 開発・運用ガイド

本プロジェクトでは、本番環境の安全性を守るため、開発（Local）と本番（Production）を明確に分離して運用します。

## 1. 開発環境の実行（Local）

開発はすべてローカル環境で行います。本番データに影響を与えることはありません。

```bash
# ローカルサーバーの起動
npm run dev
```

データベースはローカルのファイル（`.wrangler/state/v3/d1`）が使用されます。

## 2. データベース操作コマンド

ミスを防ぐため、`package.json` に定義された以下のコマンドを使用してください。

| コマンド | 内容 |
| :--- | :--- |
| `npm run db:init:local` | ローカルDBを初期化し、`schema.sql` を適用します。 |
| `npm run db:migrate:local` | ローカルDBに最新のマイグレーションを適用します。 |
| `npm run db:migrate:prod` | **【慎重に実行】** 本番用D1データベースにマイグレーションを適用します。 |

## 3. 本番環境へのデプロイ

機能の開発とローカルでの確認が終わったら、以下の手順でデプロイします。

```bash
# 1. GitHubのmainブランチにマージ（推奨）
# または
# 2. 手動デプロイを実行
npm run deploy
```

`npm run deploy` は以下の処理を自動で行います：
1. `next build` (ビルド)
2. `next-on-pages` (Cloudflare互換ビルド)
3. `wrangler pages deploy` (デプロイ)

## 4. 禁止事項

- `npx wrangler d1 execute ... --remote` を安易に実行しないでください。
- 本番のAPIキーやシークレットは、ローカルの `.env` ファイルには含めず、Cloudflareの管理画面から設定してください。

---
Produced by Antigravity (Google DeepMind)
