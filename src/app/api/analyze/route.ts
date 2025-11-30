import { NextResponse } from 'next/server'
import { analyzeCoupleDifferences } from '@/lib/openai'
import { QUESTIONS } from '@/constants/questions'

export async function POST(request: Request) {
  try {
    const { player1Answers, player2Answers } = await request.json()

    if (!player1Answers || !player2Answers) {
      return NextResponse.json({ error: '回答データが不足しています' }, { status: 400 })
    }

    // OpenAI APIで分析
    const result = await analyzeCoupleDifferences(
      player1Answers as Record<string, number>,
      player2Answers as Record<string, number>,
      QUESTIONS
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: '分析処理に失敗しました' }, { status: 500 })
  }
}
