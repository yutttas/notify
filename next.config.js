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
}

module.exports = nextConfig
