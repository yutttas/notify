import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export const maxDuration = 60

export async function GET() {
  try {
    console.log('[test-openai] Testing OpenAI API connection...')

    const start = Date.now()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'テスト: こんにちは',
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    })

    const duration = Date.now() - start

    console.log('[test-openai] Success! Duration:', duration, 'ms')

    return NextResponse.json({
      success: true,
      message: 'OpenAI API接続成功',
      response: completion.choices[0]?.message?.content,
      duration: `${duration}ms`,
    })
  } catch (error) {
    console.error('[test-openai] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
