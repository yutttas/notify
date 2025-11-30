/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // ログレベルを詳細に設定
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Vercel環境での最大実行時間を60秒に設定（Hobby/Proプランで有効）
  // https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration
  maxDuration: 60,
}

module.exports = nextConfig
