import OpenAI from 'openai'
import type { GapGrade, AnalysisResult, CategoryReport, CategoryType } from '@/types'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  const errorMsg = 'OpenAI APIキーが設定されていません。Vercelの環境変数設定でOPENAI_API_KEYを設定してください。'
  console.error('[openai]', errorMsg)
  throw new Error(errorMsg)
}

console.log('[openai] OpenAI client initialized successfully')

export const openai = new OpenAI({
  apiKey,
  timeout: 60000, // 60秒のタイムアウト（余裕を持たせる）
  maxRetries: 3, // 最大3回リトライ
})

const CATEGORY_NAMES: Record<CategoryType, string> = {
  vision: '価値観・ビジョン（方向性の一致）',
  operation: '運営・役割分担',
  communication: '対話・心理的安全性（風通しの良さ）',
  trust: '信頼・パートナーシップ（関係の質）',
  self_assessment: '総合：自己評価',
}

interface ScoreDiff {
  questionId: string
  questionText: string
  category: CategoryType
  diff: number // 差分の絶対値
}

export async function analyzeCoupleDifferences(
  hostAnswers: Record<string, number>,
  guestAnswers: Record<string, number>,
  questions: Array<{ id: string; text: string; category: CategoryType }>
): Promise<AnalysisResult & { categoryReports: CategoryReport[] }> {
  try {
    console.log('[analyzeCoupleDifferences] Starting analysis')

    // 各人のスコアを計算（50点満点）
    const hostTotalScore = Object.values(hostAnswers).reduce((sum, score) => sum + score, 0)
    const guestTotalScore = Object.values(guestAnswers).reduce((sum, score) => sum + score, 0)

    // 合計スコア（100点満点）
    const totalScore = hostTotalScore + guestTotalScore

    // スコア差分を計算
    const diffs: ScoreDiff[] = questions.map((q) => ({
      questionId: q.id,
      questionText: q.text,
      category: q.category,
      diff: Math.abs(hostAnswers[q.id] - guestAnswers[q.id]),
    }))

    // カテゴリー別の平均差分を計算
    const categoryDiffs = new Map<CategoryType, number>()
    const categoryCounts = new Map<CategoryType, number>()
    const categoryScores = new Map<CategoryType, number>()

    diffs.forEach((d) => {
      categoryDiffs.set(d.category, (categoryDiffs.get(d.category) || 0) + d.diff)
      categoryCounts.set(d.category, (categoryCounts.get(d.category) || 0) + 1)

      // カテゴリーごとの合計スコアも計算
      const hostScore = hostAnswers[d.questionId]
      const guestScore = guestAnswers[d.questionId]
      categoryScores.set(d.category, (categoryScores.get(d.category) || 0) + hostScore + guestScore)
    })

    const categoryAvgs = new Map<CategoryType, number>()
    categoryDiffs.forEach((total, category) => {
      const count = categoryCounts.get(category) || 1
      categoryAvgs.set(category, total / count)
    })

    // 総合的な差分スコアを計算
    const totalDiff = diffs.reduce((sum, d) => sum + d.diff, 0)
    const avgDiff = totalDiff / diffs.length

    // グレード判定（100点満点スコアベース）
    const grade = calculateGrade(totalScore, avgDiff)

    // カテゴリー別レポート生成（self_assessmentは除外）
    const categoryReports: CategoryReport[] = []
    for (const [category, avgCategoryDiff] of categoryAvgs.entries()) {
      // 総合：自己評価カテゴリーはレポートに含めない
      if (category === 'self_assessment') continue

      const categoryQuestions = diffs.filter((d) => d.category === category)
      const categoryScore = categoryScores.get(category) || 0
      const categoryMaxScore = (categoryCounts.get(category) || 1) * 5 * 2 // 質問数 × 5点 × 2人
      const status = getCategoryStatus(categoryScore, categoryMaxScore, avgCategoryDiff)

      console.log(`[analyzeCoupleDifferences] Generating report for category: ${category}`)
      const report = await generateCategoryReport(category, categoryQuestions, avgCategoryDiff, categoryScore, categoryMaxScore)

      categoryReports.push({
        category,
        categoryName: CATEGORY_NAMES[category],
        status,
        report,
      })
    }

    // 全体サマリー生成
    console.log('[analyzeCoupleDifferences] Generating overall summary')
    const summary = await generateOverallSummary(grade, categoryReports, totalScore)

    console.log('[analyzeCoupleDifferences] Analysis completed successfully')
    return {
      summary,
      grade,
      categoryReports,
    }
  } catch (error) {
    console.error('[analyzeCoupleDifferences] Error details:', error)
    if (error instanceof Error) {
      console.error('[analyzeCoupleDifferences] Error message:', error.message)
      console.error('[analyzeCoupleDifferences] Error stack:', error.stack)
    }

    // OpenAI APIのエラーの詳細を判定
    let errorMessage = 'AI分析処理でエラーが発生しました。'
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'AI分析がタイムアウトしました。もう一度お試しください。'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'アクセスが集中しています。少し時間をおいてからお試しください。'
      } else if (error.message.includes('API key')) {
        errorMessage = 'サーバー設定エラーが発生しました。管理者にお問い合わせください。'
      } else {
        errorMessage = `AI分析処理に失敗しました: ${error.message}`
      }
    }

    throw new Error(errorMessage)
  }
}

async function generateCategoryReport(
  category: CategoryType,
  questions: ScoreDiff[],
  avgDiff: number,
  categoryScore: number,
  categoryMaxScore: number
): Promise<string> {
  const scorePercentage = (categoryScore / categoryMaxScore) * 100

  // 差分が大きい質問を特定
  const largeGapQuestions = questions.filter(q => q.diff >= 2)
  const moderateGapQuestions = questions.filter(q => q.diff >= 1 && q.diff < 2)

  // 質問ごとの差分情報を構築（具体的な差分値は含めるが、個別スコアは含めない）
  const questionDetails = questions.map(q => {
    const gapLevel = q.diff >= 2 ? '大きなずれ' : q.diff >= 1 ? 'ずれ' : '小さなずれ'
    return `質問「${q.questionText}」: ${gapLevel}`
  }).join('\n')

  // カテゴリー別の具体的なアドバイスのヒント
  const categoryAdvice: Record<CategoryType, string> = {
    vision: '将来のビジョンや金銭感覚など、方向性に関わる重要な領域です。大きなずれがある場合は、具体的に「金銭面や将来設計について、じっくり話し合う時間を持つことをお勧めします」のようなアドバイスを。',
    operation: '家事分担や時間配分など、日常の運営に関わる領域です。ずれがある場合は、「家事分担のルールや、お互いの時間の使い方について話し合ってみましょう」のようなアドバイスを。',
    communication: '対話や心理的安全性に関わる領域です。ずれがある場合は、「コミュニケーションの頻度や方法について、お互いの期待を共有してみましょう」のようなアドバイスを。',
    trust: '信頼関係やパートナーシップに関わる領域です。ずれがある場合は、「お互いへの期待や関係性について、率直に語り合う時間を作ってみましょう」のようなアドバイスを。',
    self_assessment: '総合的な自己評価の領域です。',
  }

  // プロンプトを詳細化して、具体的なアドバイスを生成
  const prompt = `カテゴリー: ${CATEGORY_NAMES[category]}
${questionDetails}

${largeGapQuestions.length > 0 ? `\n特に大きなずれがある質問: ${largeGapQuestions.map(q => q.questionText).join('、')}` : ''}

【重要な指示】
1. お二人の認識のずれている具体的なポイントを2〜3行で指摘してください
2. その後、「〜について話し合う時間を持つことをお勧めします」のような具体的なアドバイスを1〜2行で追加してください
3. 数値（点数や割合）は絶対に含めないでください
4. ${categoryAdvice[category]}
5. 温かく、前向きなトーンで伝えてください`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは夫婦関係の専門カウンセラーです。お二人の回答の違いから、認識のずれているポイントを具体的に指摘し、建設的なアドバイスを提供します。点数などの数値は一切言及せず、温かく前向きなアドバイスを心がけてください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 350,
    })

    return completion.choices[0]?.message?.content?.trim() || 'レポートの生成に失敗しました。'
  } catch (error) {
    console.error(`[generateCategoryReport] Error for category ${category}:`, error)
    throw error
  }
}

async function generateOverallSummary(
  grade: GapGrade,
  categoryReports: CategoryReport[],
  totalScore: number
): Promise<string> {
  const gradeDescriptions: Record<GapGrade, string> = {
    excellent: '非常に良好',
    good: '良好',
    caution: 'すれ違いの可能性あり',
    attention: '話し合いの必要あり',
  }

  // プロンプトを簡潔にして応答速度を向上（点数は非表示）
  const prompt = `評価: ${gradeDescriptions[grade]}
カテゴリー: ${categoryReports.map((cr) => `${cr.status}`).join('、')}

夫婦関係のカウンセラーとして、3-4行の前向きな総合メッセージを日本語で。具体的な点数は言及しないこと。`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '夫婦関係の専門カウンセラー。温かく前向きなメッセージを伝える。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    return completion.choices[0]?.message?.content?.trim() || 'レポートの生成に失敗しました。'
  } catch (error) {
    console.error('[generateOverallSummary] Error:', error)
    throw error
  }
}

function getCategoryStatus(categoryScore: number, categoryMaxScore: number, avgDiff: number): string {
  const scorePercentage = (categoryScore / categoryMaxScore) * 100

  // 1, 2が出たら必然的に「話し合いの必要あり」
  // スコアが低い場合も「話し合いの必要あり」とする
  if (scorePercentage < 40 || avgDiff >= 2.0) return '話し合いの必要あり'

  // 差分が大きい場合
  if (avgDiff >= 1.5) return 'すれ違いの可能性あり'

  // スコアに基づく判定
  if (scorePercentage >= 90) return '非常に良好'
  if (scorePercentage >= 80) return '良好'
  if (scorePercentage >= 60) return 'すれ違いの可能性あり'

  return '話し合いの必要あり'
}

function calculateGrade(totalScore: number, avgDiff: number): GapGrade {
  // 総合評価: 100点満点（10問×5点×2人）
  // 非常に良好: 90〜100 (90%)
  // 良好: 80〜89 (80%)
  // すれ違いの可能性あり: 60〜79 (60%)
  // 話し合いの必要あり: 〜59
  // 1、2が出たら（つまり非常に低いスコア）必然的に「話し合いの必要あり」

  if (totalScore < 40 || avgDiff >= 2.5) return 'attention' // 話し合いの必要あり
  if (totalScore >= 90 && avgDiff <= 1.0) return 'excellent' // 非常に良好
  if (totalScore >= 80 && avgDiff <= 1.5) return 'good' // 良好
  if (totalScore >= 60) return 'caution' // すれ違いの可能性あり

  return 'attention' // 話し合いの必要あり
}
