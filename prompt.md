# Project "Oshi-Link" - Comprehensive Implementation Prompt

## 1. Mission Statement
ファン参加型・スケジュール共有プラットフォーム「Oshi-Link」を構築せよ。
高いデザイン性とモバイルでの圧倒的な使い勝手を両立し、Cloudflareのモダンなスタック（D1, Pages, Workers）を最大限に活用した、高速でプレミアムなWebアプリケーションを実現すること。

---

## 2. Technical Stack & Architecture
- **Framework**: Next.js (App Router) - 全てのAPIとページを Edge Runtime で動作させる。
- **Styling**: Tailwind CSS (Vanilla CSS) - カスタムカラーパレットとモダンなタイポグラフィ（Inter/Outfit）。
- **Database**: Cloudflare D1 (SQLite) - ユーザー、グループ（カレンダー）、イベント、フォロー関係の管理。
- **Authentication**: 
    - Google OAuth 2.0
    - Magic Link (Resend API) - パスワードレス認証。
- **External APIs**:
    - OpenStreetMap Nominatim (場所検索)
    - Rakuten Travel Affiliate API (遠征支援リンク)

---

## 3. UI/UX Design System (Airbnb & Discord Style)

### A. Dashboard Layout
- **Left Sidebar**: Discordスタイルのカレンダー（グループ）リスト。
    - フォロー中のグループを一覧表示。
    - 各項目には「個人設定（パレット）」「通知設定（ベル）」「削除（ゴミ箱）」ボタンを配置。
    - モバイルではサイドバーはドロワー形式。
- **Main Content**: 月間カレンダー表示。
    - **Event Items**: 
        - タイトルの前に開始時間（HH:mm）を表示。
        - 形状は「パキッとした四角（`rounded-none`）」で統一し、左側に太めのグループカラーボーダーを配置。
        - カテゴリごとに淡い背景色を設定。
- **Right Sidebar**: 予定一覧。
    - 選択中のグループの全予定を時系列でリスト表示。

### B. Mobile Optimization (Critical)
- **Dialogs/Modals**: 
    - スマートフォンでは「下部からせり出すボトムシート形式（`bottom-0`）」、PCでは中央表示に切り替える。
    - ダイアログ右上にフローティング形式の「×」ボタンを配置。
- **Add Event Modal**:
    - 「年月日」「開始」「終了」を1行にまとめ、ファーストビューで全ての入力項目が見えるように極限まで圧縮。
    - 横スクロールを厳格に禁止（`overflow-x-hidden`）。

---

## 4. Core Features & Logic

### A. Event Categories
- 5つの大カテゴリとそれぞれに対応する小カテゴリを実装。
    - **オフライン系**: ライブ、握手会、試合、ファンミ
    - **オンライン系**: 動画配信、LIVE配信
    - **放送系**: テレビ、ラジオ
    - **記念日系**: 誕生日、周年
    - **発売系**: グッズ
- カテゴリごとに独自の淡いカラーコードを割り当てる。

### B. Trust & Reliability System
- ユーザー投稿型の予定に対し、内部アルゴリズムに基づき「情報の信頼度（高/低）」バッジを表示。
- 仮の予定には「！」アイコンと `opacity-85` の視覚効果を適用。
- ゲーミング（荒らし）防止のため、自動削除の具体的な閾値はユーザーには非表示とする。

### C. Travel Support (Monetization)
- イベント詳細画面で、開催場所に基づいた「近隣の宿泊施設を探す（楽天トラベル）」リンクを自動生成。
- アフィリエイトIDを組み込んだURLエンコード処理。

---

## 5. Sequence of Implementation Tasks
1. **D1 Schema Setup**: `users`, `groups`, `events`, `follows` テーブルの定義。
2. **Auth Flow**: Magic Link と Google Auth のハイブリッド実装。
3. **Core Calendar**: カレンダーのレンダリングと、PC/モバイルでの情報密度（開始時間表示等）の最適化。
4. **Group Management**: カレンダーの追加・削除・色カスタマイズ機能。
5. **Mobile Polishing**: 全てのモーダルをボトムシート化し、入力フォームをスマホ向けに極限まで圧縮。
6. **Deploy**: Cloudflare Pages へデプロイし、`oshi-link-official.pages.dev` で公開。

---

## 6. Design Aesthetic Rules
- **Rich Aesthetics**: グラデーション、グラスモルフィズム、繊細な影（`shadow-2xl`）を多用する。
- **Micro-animations**: ボタンの `active:scale-95` や、ダイアログの `duration-500` の滑らかな遷移。
- **No Placeholders**: 画像が必要な場合はAIで生成するか、実用的なアセットを使用する。


課金要素について
