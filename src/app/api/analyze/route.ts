import { NextResponse } from 'next/server'
import { analyzeCoupleDifferences } from '@/lib/openai'
import { QUESTIONS } from '@/constants/questions'

// Vercel環境での最大実行時間を60秒に設定
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    console.log('[POST /api/analyze] Starting analysis')

    const { player1Answers, player2Answers } = await request.json()

    if (!player1Answers || !player2Answers) {
      console.error('[POST /api/analyze] Missing answer data')
      return NextResponse.json({ error: '回答データが不足しています' }, { status: 400 })
    }

    // 回答データのバリデーション
    const player1Keys = Object.keys(player1Answers)
    const player2Keys = Object.keys(player2Answers)

    if (player1Keys.length === 0 || player2Keys.length === 0) {
      console.error('[POST /api/analyze] Empty answer data')
      return NextResponse.json({ error: '回答データが空です' }, { status: 400 })
    }

    console.log('[POST /api/analyze] Answer data validated, calling OpenAI API')

    // OpenAI APIで分析
    const result = await analyzeCoupleDifferences(
      player1Answers as Record<string, number>,
      player2Answers as Record<string, number>,
      QUESTIONS
    )

    console.log('[POST /api/analyze] Analysis completed successfully')
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/analyze] Error:', error)

    // エラーの詳細をログ出力
    if (error instanceof Error) {
      console.error('[POST /api/analyze] Error message:', error.message)
      console.error('[POST /api/analyze] Error stack:', error.stack)
    }

    // ユーザーフレンドリーなエラーメッセージを返す
    const errorMessage = error instanceof Error ? error.message : '分析処理に失敗しました'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
