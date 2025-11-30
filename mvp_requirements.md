# MVP要件定義書：Futa-Re (v1.0)

## 1. プロジェクト方針
* **最速リリース:** 認証機能（ログイン）を省き、URL共有のみで完結させる。
* **モバイルファースト:** スマホでの操作性を最優先。
* **ハレーションフリー:** フロントエンドに「相手の回答生データ」を絶対に渡さない。

## 2. 技術スタック（推奨）
* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
* **UI Component:** shadcn/ui (デザイン構築の時短)
* **Backend/DB:** Supabase (PostgreSQL) - サーバーレスで構築
* **AI:** OpenAI API (gpt-4o-mini) - コスパと速度重視

## 3. データモデル (Supabase Schema)

### `rooms` テーブル
* `id` (uuid, PK): ルームID
* `created_at` (timestamp): 作成日
* `status` (text): 'waiting' (1人目回答済) | 'completed' (2人とも回答済)
* `summary_report` (text): AIが生成したレポート（完了後に格納）
* `gap_grade` (text): S/A/B/C の判定ランク

### `answers` テーブル
* `id` (uuid, PK)
* `room_id` (uuid, FK): rooms.id
* `user_type` (text): 'host' (作成者) | 'guest' (パートナー)
* `answers` (jsonb): { "q1": 5, "q2": 3, ... "q10": 4 }
* `created_at` (timestamp)

## 4. 画面遷移と機能

### P1. トップページ (/)
* **機能:** 「診断ルームを作成する」ボタンのみ。
* **処理:** ボタン押下でUUIDを発行し、`rooms`テーブルにレコード作成。P2へ遷移。

### P2. 回答画面 (/room/[id])
* **状態A (未回答):**
    * 10問の設問をカード形式で表示（スワイプまたは「次へ」ボタン）。
    * **重要:** 設問文言は要件定義書のQ1〜Q10を使用。
    * 回答完了後、`answers`に保存。
* **状態B (片方回答済み・相手待ち):**
    * 「パートナーの回答を待っています」画面。
    * 共有用URLコピーボタンを表示。
* **状態C (双方回答済み):**
    * P3（結果画面）へ自動遷移、または「結果を見る」ボタン表示。

### P3. 結果画面 (/room/[id]/result)
* **表示条件:** `rooms`テーブルの当該レコードにおいて、host/guest両方の回答が存在すること。
* **表示内容:**
    1. **判定ランク:** S〜Cのバッジ表示
    2. **AIレポート:** データベースの `summary_report` を表示。
    3. **アクション:** 「トップに戻る」のみ。
    * **注意:** 生の回答スコアやグラフは表示しない。

## 5. バックエンドロジック (Server Actions)

### AI判定プロセス (`generateReport`)
* **トリガー:** 2人目の回答が送信された瞬間。
* **処理:**
    1. `answers`から2人分のJSONを取得。
    2. カテゴリごとのスコア差分を計算。
    3. OpenAI APIにプロンプト（要件定義書準拠）を送信。
    4. 返ってきたテキストと判定ランクを `rooms` テーブルに保存。
    5. クライアントに完了ステータスを返す。
