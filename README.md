# Notify - 夫婦のすれ違い診断アプリ

夫婦がそれぞれ10問の設問に回答し、AIがその「すれ違い」のみをマイルドに指摘する診断Webアプリです。

## 機能

- ユーザー登録不要でルームURLを共有して診断
- 10問の設問に1-5のスコアで回答
- 両者の回答が完了すると、OpenAI APIで分析
- すれ違い度をS〜Dグレードで評価
- 優しいトーンで話し合いのきっかけを提供

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Lucide React
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API (gpt-4o-mini)

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`を参考に`.env.local`ファイルを作成してください。

```bash
cp .env.local.example .env.local
```

以下の環境変数を設定します：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

#### Supabaseの設定

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで`supabase/schema.sql`を実行
3. Project Settings > APIから以下を取得：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### OpenAIの設定

1. [OpenAI Platform](https://platform.openai.com)でAPIキーを作成
2. APIキー → `OPENAI_API_KEY`

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## プロジェクト構成

```
futare/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # ルートレイアウト
│   │   ├── page.tsx          # トップページ
│   │   ├── room/
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # 回答/待機ページ
│   │   │       └── result/
│   │   │           └── page.tsx # 結果ページ
│   │   └── globals.css
│   ├── actions/              # Server Actions
│   │   ├── room.ts
│   │   └── answer.ts
│   ├── components/           # Reactコンポーネント
│   │   ├── ui/              # shadcn/uiコンポーネント
│   │   ├── QuestionForm.tsx
│   │   ├── WaitingRoom.tsx
│   │   └── ResultDisplay.tsx
│   ├── lib/                  # ユーティリティ
│   │   ├── supabase.ts
│   │   ├── openai.ts
│   │   └── utils.ts
│   ├── types/                # 型定義
│   │   └── index.ts
│   └── constants/            # 定数
│       └── questions.ts
├── supabase/
│   └── schema.sql            # データベーススキーマ
└── package.json
```

## 使い方

1. トップページで「診断を始める」をクリック
2. 10問の設問に1-5で回答
3. 回答完了後、パートナーにURLを共有
4. 両者の回答が完了すると自動的に結果ページへ遷移
5. AIが生成した分析レポートとグレードを確認

## ライセンス

MIT
