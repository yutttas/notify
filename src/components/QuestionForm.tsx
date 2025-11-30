'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitAnswer } from '@/actions/answer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
        <RadioGroup
          value={answers[currentQuestion.id]?.toString()}
          onValueChange={(value) => {
            setAnswers((prev) => ({
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
  )
}
