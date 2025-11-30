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
  const smallGapQuestions = questions.filter(q => q.diff < 1)

  // カテゴリーの状態を判定（良好 vs 要注意）
  const isGoodCategory = scorePercentage >= 80 && avgDiff < 1.5

  // カテゴリー別の称賛・改善アドバイス
  const categoryPositiveAdvice: Record<CategoryType, string> = {
    vision: 'お二人の将来のビジョンや価値観がよく一致しているようです。この調和を大切にし、引き続き定期的に夢や目標を語り合う時間を持ち続けてください。',
    operation: '日常生活の運営や役割分担について、お互いの認識が近いようです。この協力関係を維持しながら、お互いに感謝の気持ちを伝え合うことを心がけてください。',
    communication: '対話や心理的な安全性について、良好な関係が築けているようです。この風通しの良さを大切に、引き続きオープンなコミュニケーションを続けてください。',
    trust: '信頼関係やパートナーシップの質が高いようです。この信頼を基盤に、お互いを尊重し合う関係を今後も育んでいってください。',
    self_assessment: '総合的に良好な自己評価です。',
  }

  const categoryImprovementAdvice: Record<CategoryType, string> = {
    vision: '将来のビジョンや金銭感覚など、方向性に関わる重要な領域です。大きなずれがある場合は、具体的に「金銭面や将来設計について、じっくり話し合う時間を持つことをお勧めします」のようなアドバイスを。',
    operation: '家事分担や時間配分など、日常の運営に関わる領域です。ずれがある場合は、「家事分担のルールや、お互いの時間の使い方について話し合ってみましょう」のようなアドバイスを。',
    communication: '対話や心理的安全性に関わる領域です。ずれがある場合は、「コミュニケーションの頻度や方法について、お互いの期待を共有してみましょう」のようなアドバイスを。',
    trust: '信頼関係やパートナーシップに関わる領域です。ずれがある場合は、「お互いへの期待や関係性について、率直に語り合う時間を作ってみましょう」のようなアドバイスを。',
    self_assessment: '総合的な自己評価の領域です。',
  }

  let prompt: string
  let systemMessage: string

  if (isGoodCategory) {
    // 良好な場合：称賛と励ましのメッセージ
    prompt = `カテゴリー: ${CATEGORY_NAMES[category]}
スコア状況: 高スコア・認識の一致度が高い

【重要な指示】
1. このカテゴリーにおけるお二人の良好な関係性を2〜3行で具体的に称賛してください
2. 「〜が良好なようです」「〜が一致しているようです」など、ポジティブな表現を使ってください
3. 今後もこの良好な関係を維持・発展させるための前向きな応援メッセージを1〜2行で追加してください
4. ${categoryPositiveAdvice[category]}
5. 数値（点数や割合）は絶対に含めないでください
6. 温かく、励ましのあるトーンで伝えてください
7. 【表現の指示】「〜のようです」「〜かもしれません」など、柔らかい表現を使用してください`

    systemMessage = 'あなたは夫婦関係の専門カウンセラーです。お二人の良好な関係性を認め、称賛し、今後も継続できるよう励ますメッセージを提供します。温かく、前向きで、応援するトーンを心がけてください。点数などの数値は一切言及しないでください。'
  } else {
    // 改善の余地がある場合：建設的なアドバイス
    const questionDetails = questions.map(q => {
      const gapLevel = q.diff >= 2 ? '大きなずれ' : q.diff >= 1 ? 'ずれ' : '小さなずれ'
      return `質問「${q.questionText}」: ${gapLevel}`
    }).join('\n')

    prompt = `カテゴリー: ${CATEGORY_NAMES[category]}
${questionDetails}

${largeGapQuestions.length > 0 ? `\n特に大きなずれがある質問: ${largeGapQuestions.map(q => q.questionText).join('、')}` : ''}

【重要な指示】
1. お二人の認識のずれている具体的なポイントを2〜3行で指摘してください
2. その後、「〜について話し合う時間を持つことをお勧めします」のような具体的なアドバイスを1〜2行で追加してください
3. 数値（点数や割合）は絶対に含めないでください
4. ${categoryImprovementAdvice[category]}
5. 温かく、前向きなトーンで伝えてください
6. 【表現の指示】断定的な表現は避け、「〜のようです」「〜かもしれません」「〜の可能性があります」「〜と考えられます」など、柔らかく曖昧性のある表現を使用してください。AIの推測に過ぎないことを意識させる表現を心がけてください。`

    systemMessage = 'あなたは夫婦関係の専門カウンセラーです。お二人の回答の違いから、認識のずれているポイントを指摘し、建設的なアドバイスを提供します。ただし、あくまでAIによる推測であることを踏まえ、断定的な表現は避け、「〜のようです」「〜かもしれません」「〜の可能性があります」など、柔らかく抽象度の高い表現を使用してください。点数などの数値は一切言及せず、温かく前向きなアドバイスを心がけてください。'
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
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

  const isGoodRelationship = grade === 'excellent' || grade === 'good'

  let prompt: string
  let systemMessage: string

  if (isGoodRelationship) {
    // 良好な関係の場合：称賛と励まし
    prompt = `総合評価: ${gradeDescriptions[grade]}
カテゴリー状況: ${categoryReports.map((cr) => `${cr.categoryName} - ${cr.status}`).join('、')}

【重要な指示】
1. お二人の関係性が全体的に良好であることを3〜4行で称賛してください
2. 「素晴らしい関係性」「良好なバランス」「お互いを理解し合えている」など、ポジティブな表現を使ってください
3. 今後もこの良い関係を維持・発展させるための応援メッセージを含めてください
4. 数値（点数や割合）は絶対に含めないでください
5. 温かく、励ましのあるトーンで伝えてください
6. 【表現の指示】「〜のようです」「〜と感じられます」など、柔らかい表現を使用してください`

    systemMessage = '夫婦関係の専門カウンセラー。お二人の良好な関係性を心から称賛し、今後も継続できるよう励ますメッセージを提供します。温かく、前向きで、応援するトーンを心がけてください。'
  } else {
    // 改善の余地がある場合：建設的なアドバイス
    prompt = `総合評価: ${gradeDescriptions[grade]}
カテゴリー状況: ${categoryReports.map((cr) => `${cr.categoryName} - ${cr.status}`).join('、')}

【重要な指示】
1. お二人の関係性について、改善の余地がある点を3〜4行で優しく指摘してください
2. 前向きで建設的なアドバイスを含めてください
3. 数値（点数や割合）は絶対に含めないでください
4. 温かく、希望を持てるトーンで伝えてください
5. 【表現の指示】断定的な表現は避け、「〜のようです」「〜かもしれません」「〜の可能性があります」など、柔らかく曖昧性のある表現を使用してください`

    systemMessage = '夫婦関係の専門カウンセラー。温かく前向きなメッセージを伝える。ただし、あくまでAIによる推測であることを踏まえ、断定的な表現は避け、「〜のようです」「〜かもしれません」「〜の可能性があります」など、柔らかく抽象度の高い表現を使用してください。'
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
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
