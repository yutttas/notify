'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QUESTIONS, SCORE_OPTIONS } from '@/constants/questions'
import { ChevronLeft, ChevronRight, Send, UserCircle, Loader2 } from 'lucide-react'

type PlayerType = 'player1' | 'player2'

interface GameState {
  currentPlayer: PlayerType
  player1Answers: Record<string, number>
  player2Answers: Record<string, number>
  isCompleted: boolean
}

export default function DiagnosisPage() {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: 'player1',
    player1Answers: {},
    player2Answers: {},
    isCompleted: false,
  })

  // 初期化: 常に私の回答から始める
  useEffect(() => {
    // 古い状態をクリアして、常に最初から開始
    const initialState: GameState = {
      currentPlayer: 'player1',
      player1Answers: {},
      player2Answers: {},
      isCompleted: false,
    }
    setGameState(initialState)
    localStorage.removeItem('notify_game_state')
    localStorage.removeItem('notify_result')
  }, [])

  // 状態をローカルストレージに保存
  const saveGameState = (newState: GameState) => {
    setGameState(newState)
    localStorage.setItem('notify_game_state', JSON.stringify(newState))
  }

  const currentQuestion = QUESTIONS[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1
  // スライダーは常にデフォルト値(3)を持つため、常に回答済みとして扱う
  const hasAnsweredCurrent = true
  const playerLabel = gameState.currentPlayer === 'player1' ? '私' : 'パートナー'

  const handleNext = () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    // すべての質問に対して回答を用意（未回答の場合はデフォルト値3を使用）
    const completeAnswers = QUESTIONS.reduce((acc, question) => {
      acc[question.id] = currentAnswers[question.id] ?? 3
      return acc
    }, {} as Record<string, number>)

    setIsSubmitting(true)

    try {
      if (gameState.currentPlayer === 'player1') {
        // 私の回答を保存して、パートナーへ交代
        const newState: GameState = {
          currentPlayer: 'player2',
          player1Answers: completeAnswers,
          player2Answers: {},
          isCompleted: false,
        }
        saveGameState(newState)
        setCurrentAnswers({})
        setCurrentQuestionIndex(0)
        alert('私の回答が完了しました。\nスマホをパートナーに渡してください。')
      } else {
        // パートナーの回答を保存して、結果ページへ
        const newState: GameState = {
          ...gameState,
          player2Answers: completeAnswers,
          isCompleted: true,
        }
        saveGameState(newState)

        // AI分析を実行
        setIsAnalyzing(true)
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player1Answers: gameState.player1Answers,
            player2Answers: completeAnswers,
          }),
        })

        if (!response.ok) {
          throw new Error('分析に失敗しました')
        }

        const result = await response.json()
        localStorage.setItem('notify_result', JSON.stringify(result))
        setIsAnalyzing(false)
        router.push('/result')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('送信に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
      setIsAnalyzing(false)
    }
  }

  // AI分析中の表示
  if (isAnalyzing) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl border-2 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-8">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 opacity-20 animate-pulse"></div>
              <Loader2 className="absolute inset-0 m-auto h-12 w-12 text-purple-600 animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">AIが分析中です</h3>
            <p className="text-gray-600 text-center">
              お二人の回答を分析しています。
              <br />
              しばらくお待ちください...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl border-2 shadow-xl">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-100 to-purple-100 p-3">
            <UserCircle className="h-5 w-5 text-purple-600" />
            <span className="font-bold text-purple-800">{playerLabel}の回答</span>
          </div>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              質問 {currentQuestionIndex + 1} / {QUESTIONS.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
          <CardDescription>あなたの気持ちに近いものを選んでください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 注意事項 */}
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground border">
            <p>
              ⚠️ 診断内容はAI分析に基づくものです。あくまで一つの意見として参考にしてください。
            </p>
            <p>
              🔒 回答内容やスコアはお互いに見えることはありませんので、安心して正直に回答してください。
            </p>
          </div>

          <div className="space-y-6">
            {/* 選択中の回答を大きく表示 */}
            <div className="text-center py-3">
              <div className="inline-block rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-8 py-4 border-2 border-indigo-200 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">選択中の回答</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {SCORE_OPTIONS.find((opt) => opt.value === (currentAnswers[currentQuestion.id] || 3))?.label || '普通'}
                </p>
              </div>
            </div>

            {/* スライダーとラベルを一体化 */}
            <div className="relative px-2">
              {/* ラベル表示 */}
              <div className="flex justify-between text-xs text-gray-600 px-1 mb-3">
                {SCORE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    className={`flex-1 text-center transition-all ${
                      currentAnswers[currentQuestion.id] === option.value
                        ? 'font-bold text-purple-700 scale-110'
                        : 'opacity-60'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-tight">{option.label}</div>
                  </div>
                ))}
              </div>

              {/* スライダー */}
              <div className="py-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={currentAnswers[currentQuestion.id] || 3}
                  onChange={(e) => {
                    setCurrentAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: parseInt(e.target.value),
                    }))
                  }}
                  className="w-full h-3 bg-gradient-to-r from-rose-200 via-amber-100 to-teal-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: 'linear-gradient(to right, #fecdd3 0%, #fef3c7 50%, #ccfbf1 100%)',
                  }}
                />
                {/* スライダーのスタイルを追加 */}
                <style jsx>{`
                  .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
                    transition: all 0.2s ease;
                  }
                  .slider::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.6);
                  }
                  .slider::-moz-range-thumb {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
                    transition: all 0.2s ease;
                  }
                  .slider::-moz-range-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.6);
                  }
                `}</style>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentQuestionIndex === 0}
              className="flex-1"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>

            {isLastQuestion ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!hasAnsweredCurrent || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  '送信中...'
                ) : (
                  <>
                    回答を送信
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!hasAnsweredCurrent}
                className="flex-1"
              >
                次へ
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
