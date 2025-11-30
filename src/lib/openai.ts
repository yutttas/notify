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
  timeout: 50000, // 50秒のタイムアウト
  maxRetries: 2, // 最大2回リトライ
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
    console.log('[analyzeCoupleDifferences] Total score:', totalScore)

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
    console.log('[analyzeCoupleDifferences] Grade calculated:', grade)

    // カテゴリー別レポート生成（順次実行でタイムアウトを防ぐ）
    console.log('[analyzeCoupleDifferences] Generating category reports...')
    const categoryReports: CategoryReport[] = []

    for (const [category, avgCategoryDiff] of categoryAvgs.entries()) {
      console.log('[analyzeCoupleDifferences] Processing category:', category)
      const categoryQuestions = diffs.filter((d) => d.category === category)
      const categoryScore = categoryScores.get(category) || 0
      const categoryMaxScore = (categoryCounts.get(category) || 1) * 5 * 2 // 質問数 × 5点 × 2人
      const status = getCategoryStatus(categoryScore, categoryMaxScore, avgCategoryDiff)

      try {
        const report = await generateCategoryReport(
          category,
          categoryQuestions,
          avgCategoryDiff,
          categoryScore,
          categoryMaxScore
        )

        categoryReports.push({
          category,
          categoryName: CATEGORY_NAMES[category],
          status,
          report,
        })

        console.log('[analyzeCoupleDifferences] Category report generated for:', category)
      } catch (error) {
        console.error('[analyzeCoupleDifferences] Failed to generate report for category:', category, error)
        // フォールバック: エラーが発生してもシンプルなレポートで続行
        categoryReports.push({
          category,
          categoryName: CATEGORY_NAMES[category],
          status,
          report: `${CATEGORY_NAMES[category]}について分析を行いました。詳細な分析は現在利用できませんが、全体的な傾向から判断すると${status}の状態です。`,
        })
      }
    }

    console.log('[analyzeCoupleDifferences] Category reports generated:', categoryReports.length)

    // 全体サマリー生成
    console.log('[analyzeCoupleDifferences] Generating overall summary...')
    let summary: string
    try {
      summary = await generateOverallSummary(grade, categoryReports, totalScore)
      console.log('[analyzeCoupleDifferences] Overall summary generated successfully')
    } catch (error) {
      console.error('[analyzeCoupleDifferences] Failed to generate overall summary:', error)
      // フォールバック: シンプルなサマリーを生成
      const gradeText = grade === 'excellent' ? '非常に良好' : grade === 'good' ? '良好' : grade === 'caution' ? 'すれ違いの可能性あり' : '話し合いの必要あり'
      summary = `お二人の診断結果は「${gradeText}」です。総合スコアは${totalScore}点でした。各カテゴリーの詳細をご確認の上、お二人で話し合う機会を持たれることをお勧めします。`
    }

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
    throw new Error(`OpenAI API呼び出しに失敗しました: ${error instanceof Error ? error.message : String(error)}`)
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

  // プロンプトを簡潔にして応答速度を向上
  const prompt = `カテゴリー: ${CATEGORY_NAMES[category]}
平均差分: ${avgDiff.toFixed(1)}
達成率: ${scorePercentage.toFixed(1)}%

夫婦関係のカウンセラーとして、上記データから2-3行の前向きなアドバイスを日本語で。数値は暴露しないこと。`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '夫婦関係の専門カウンセラー。簡潔で前向きなアドバイスをする。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  })

  return completion.choices[0]?.message?.content?.trim() || 'レポートの生成に失敗しました。'
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

  // プロンプトを簡潔にして応答速度を向上
  const prompt = `評価: ${gradeDescriptions[grade]}
スコア: ${totalScore}/100点
カテゴリー: ${categoryReports.map((cr) => `${cr.status}`).join('、')}

夫婦関係のカウンセラーとして、3-4行の前向きな総合メッセージを日本語で。`

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
  // 総合評価: 100点満点
  // 非常に良好: 90〜100
  // 良好: 80〜89
  // すれ違いの可能性あり: 60〜79
  // 話し合いの必要あり: 20〜59
  // 1、2が出たら（つまり非常に低いスコア）必然的に「話し合いの必要あり」

  if (totalScore < 40 || avgDiff >= 2.5) return 'attention' // 話し合いの必要あり
  if (totalScore >= 90 && avgDiff <= 1.0) return 'excellent' // 非常に良好
  if (totalScore >= 80 && avgDiff <= 1.5) return 'good' // 良好
  if (totalScore >= 60) return 'caution' // すれ違いの可能性あり

  return 'attention' // 話し合いの必要あり
}
