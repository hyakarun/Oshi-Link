Deploying Oshi-Link MVP
Google Antigravity Deployment Prompt: Project "Oshi-Link"
1. Mission Statement
design.mdに定義された設計指針を完全遵守し、ファン参加型・月額課金制カレンダーサービス「Oshi-Link」のMVPを構築・デプロイせよ。人間によるGUI操作は一切行わず、すべての工程をAIエージェントによる自律実行で完結させること。

2. Design & UX Foundation (Source: design.md)
以下のUI/UXリファレンスを最優先事項として適用せよ：

Navigation: Discordスタイルのサイドバー（推しグループ切り替え用）。

Calendar Display: サイドバーで切り替えた時んファーストビューはカレンダーで全ての予定を一覧表示する。カレンダーはFull calendarを使用する。

Event Display: カレンダーの項目をクリックした際は、Airbnbスタイルのクリーンな情報カードと、直感的な日付、内容等の編集UX。モーダルは透明ではなく、雰囲気に合わせたみやすい色で統一。

AddEvent: イベント追加のモーダルウィンドウで、イベント名、日付、開始時間、終了時間、詳細、ソースURLを入力できるようにする。イベント名、日付、開始時間、終了時間、ソースURLは必須項目とする。モーダルの色は透明だとみづらいので自然な色をつける。

Trust System: X(Twitter)コミュニティノートに倣った、有志によるソースURL検証UI。

UI Library: shadcn/ui をベースとし、Lucide Reactでアイコンを統一。

3. Infrastructure Strategy (Cloudflare Stack)
インフラ構築はすべてWrangler CLIまたはAPI経由で実行せよ：

Hosting: Cloudflare Pages (Next.js App Router)

Database: Cloudflare D1 (分散型SQLiteによる超高速レスポンス)

Storage: Cloudflare R2 (イベント画像およびアイコン用)

Compute: Cloudflare Workers (Stripe Webhook処理およびFANBOX連携用)

4. Autonomous Task Lists (Sequence of Actions)
Requirement Analysis: 提供された design.md を解析し、必要なD1スキーマ（users, groups, events, verifications, subscriptions）を定義せよ。

Environment Provisioning: Cloudflare上にプロジェクトを作成し、D1データベースとR2バケットを自動プロビジョニングせよ。

Core Development:

カレンダーの基本ロジック（複数グループの統合表示）の実装。

ファンによる予定追加・編集機能と、ソースURLバリデーションの実装。

Stripe Checkoutを利用した月額課金フローの構築。

External Integration: * FANBOX/Patreon APIと連携し、支援者情報をプレミアム権限へ同期するCron Workerを実装せよ。

Google/iOSカレンダーへの同期（iCal形式/Webcal）機能をプレミアム会員向けに実装せよ。

Quality Assurance & Deploy: 全てのコンポーネントがMobile Responsiveであることを確認し、production ブランチへ自動デプロイを完了させよ。

5. Output Requirements
デプロイ完了後、以下の情報を報告せよ：

Deployment URL: 公開されたアプリのURL。

Infrastructure Summary: 作成されたD1、R2、Workersの構成リスト。

Environment Variables: Stripeおよび外部連携に設定が必要なキーのリスト（秘匿情報はプレースホルダーにすること）。

Admin Access: 管理者権限を付与するための初期セットアップ手順。