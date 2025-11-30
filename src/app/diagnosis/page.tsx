'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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

  // ローカルストレージから状態を復元
  useEffect(() => {
    const saved = localStorage.getItem('notify_game_state')
    if (saved) {
      const parsedState = JSON.parse(saved)
      setGameState(parsedState)
      if (parsedState.currentPlayer === 'player1') {
        setCurrentAnswers(parsedState.player1Answers || {})
      } else {
        setCurrentAnswers(parsedState.player2Answers || {})
      }
    }
  }, [])

  // 状態をローカルストレージに保存
  const saveGameState = (newState: GameState) => {
    setGameState(newState)
    localStorage.setItem('notify_game_state', JSON.stringify(newState))
  }

  const currentQuestion = QUESTIONS[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1
  const hasAnsweredCurrent = !!currentAnswers[currentQuestion.id]
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
    if (Object.keys(currentAnswers).length !== QUESTIONS.length) {
      alert('すべての設問に回答してください。')
      return
    }

    setIsSubmitting(true)

    try {
      if (gameState.currentPlayer === 'player1') {
        // 私の回答を保存して、パートナーへ交代
        const newState: GameState = {
          currentPlayer: 'player2',
          player1Answers: currentAnswers,
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
          player2Answers: currentAnswers,
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
            player2Answers: currentAnswers,
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
          <RadioGroup
            value={currentAnswers[currentQuestion.id]?.toString()}
            onValueChange={(value) => {
              setCurrentAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: parseInt(value),
              }))
            }}
          >
            {SCORE_OPTIONS.map((option) => (
              <RadioGroupItem key={option.value} value={option.value.toString()}>
                <span className="font-medium">{option.label}</span>
              </RadioGroupItem>
            ))}
          </RadioGroup>

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
