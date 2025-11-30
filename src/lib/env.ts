// 環境変数の検証ユーティリティ

export function validateEnv() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `必須の環境変数が設定されていません: ${missing.join(', ')}\n` +
        'Vercelの環境変数設定を確認してください。'
    )
  }

  return required
}

// サーバーサイドでのみ実行
if (typeof window === 'undefined') {
  try {
    validateEnv()
    console.log('[env] All required environment variables are set')
  } catch (error) {
    console.error('[env] Environment validation failed:', error)
  }
}
