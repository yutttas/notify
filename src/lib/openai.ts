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

    // カテゴリー別レポート生成（並列実行）
    console.log('[analyzeCoupleDifferences] Generating category reports...')
    const reportPromises = Array.from(categoryAvgs.entries()).map(async ([category, avgCategoryDiff]) => {
      const categoryQuestions = diffs.filter((d) => d.category === category)
      const categoryScore = categoryScores.get(category) || 0
      const categoryMaxScore = (categoryCounts.get(category) || 1) * 5 * 2 // 質問数 × 5点 × 2人
      const status = getCategoryStatus(categoryScore, categoryMaxScore, avgCategoryDiff)

      const report = await generateCategoryReport(category, categoryQuestions, avgCategoryDiff, categoryScore, categoryMaxScore)

      return {
        category,
        categoryName: CATEGORY_NAMES[category],
        status,
        report,
      }
    })

    const categoryReports = await Promise.all(reportPromises)
    console.log('[analyzeCoupleDifferences] Category reports generated:', categoryReports.length)

    // 全体サマリー生成
    console.log('[analyzeCoupleDifferences] Generating overall summary...')
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
  const categoryDescriptions: Record<CategoryType, string> = {
    vision: '金銭感覚、将来設計、教育方針など、夫婦が見ている「未来や目的」が揃っているか',
    operation: '家事、育児、仕事（ワークライフバランス）など、日々の「タスク配分」に不公平感がないか',
    communication: '相談のしやすさ、感謝の言葉、傾聴の姿勢など、「コミュニケーションの質」が保たれているか',
    trust: '相手への尊敬、愛情、個人の尊重など、機能面以外での「情緒的な結びつき」が強いか',
    self_assessment: '仕事と家庭の両立に関する自己評価',
  }

  const scorePercentage = (categoryScore / categoryMaxScore) * 100

  const prompt = `あなたは夫婦関係のカウンセラーです。以下のカテゴリーについて、お二人の回答の違いを分析し、簡潔なレポートを作成してください。

【カテゴリー】${CATEGORY_NAMES[category]}
${categoryDescriptions[category]}

【関連する質問と差分】
${questions.map((q, i) => `${i + 1}. ${q.questionText} (差分: ${q.diff})`).join('\n')}

【平均差分】${avgDiff.toFixed(1)}
【スコア達成率】${scorePercentage.toFixed(1)}%

【重要なルール】
- 相手の具体的な回答数値は絶対に暴露しないこと
- 断定的な批判は避け、柔らかい表現を使うこと
- このカテゴリーに特化した観点でアドバイスすること
- 2〜3行の簡潔な日本語で記述すること

【出力形式】
丁寧な日本語で2〜3行のテキストのみを出力してください。`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'あなたは夫婦関係の専門カウンセラーです。優しく、前向きなアドバイスを心がけてください。',
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

  const prompt = `あなたは夫婦関係のカウンセラーです。以下の分析結果をもとに、全体的なサマリーを作成してください。

【総合評価】${gradeDescriptions[grade]}
【総合スコア】${totalScore}/100点

【カテゴリー別の状況】
${categoryReports.map((cr) => `・${cr.categoryName}: ${cr.status}`).join('\n')}

【重要なルール】
- お二人の関係性を全体的に評価し、前向きなメッセージを伝えること
- 具体的な数値は避け、温かみのある表現を使うこと
- 3〜4行の簡潔な日本語で記述すること

【出力形式】
丁寧な日本語で3〜4行のテキストのみを出力してください。`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'あなたは夫婦関係の専門カウンセラーです。優しく、前向きなアドバイスを心がけてください。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
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
