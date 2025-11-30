'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitAnswer } from '@/actions/answer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QUESTIONS, SCORE_OPTIONS } from '@/constants/questions'
import type { UserType } from '@/types'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

interface QuestionFormProps {
  roomId: string
  userType: UserType
}

export function QuestionForm({ roomId, userType }: QuestionFormProps) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentQuestion = QUESTIONS[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1
  const hasAnsweredCurrent = !!answers[currentQuestion.id]

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
    if (Object.keys(answers).length !== QUESTIONS.length) {
      alert('すべての設問に回答してください。')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('[QuestionForm] Submitting answers for room:', roomId)
      const result = await submitAnswer(roomId, userType, answers)

      console.log('[QuestionForm] Submit result:', result)

      if (result.success) {
        if (result.shouldShowResult) {
          console.log('[QuestionForm] Redirecting to result page')
          router.push(`/room/${roomId}/result`)
        } else {
          console.log('[QuestionForm] Waiting for partner, refreshing page')
          router.refresh()
        }
      } else {
        console.error('[QuestionForm] Submit failed:', result.error)
        alert(result.error || '回答の送信に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('[QuestionForm] Submit error:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      alert(`回答の送信に失敗しました。もう一度お試しください。\n\nエラー: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl border-2 shadow-xl">
      <CardHeader>
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
        <div className="space-y-6">
          {/* 選択中の回答を大きく表示 */}
          <div className="text-center py-3">
            <div className="inline-block rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 px-8 py-4 border-2 border-indigo-200 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">選択中の回答</p>
              <p className="text-2xl font-bold text-indigo-900">
                {SCORE_OPTIONS.find((opt) => opt.value === (answers[currentQuestion.id] || 3))?.label || '普通'}
              </p>
            </div>
          </div>

          {/* ラベル表示 */}
          <div className="flex justify-between text-xs text-gray-600 px-1 mb-2">
            {SCORE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex-1 text-center transition-all ${
                  answers[currentQuestion.id] === option.value
                    ? 'font-bold text-purple-700 scale-110'
                    : 'opacity-60'
                }`}
              >
                <div className="whitespace-pre-wrap leading-tight">{option.label}</div>
              </div>
            ))}
          </div>

          {/* スライダー */}
          <div className="relative px-2 py-4">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={answers[currentQuestion.id] || 3}
              onChange={(e) => {
                setAnswers((prev) => ({
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
  )
}
