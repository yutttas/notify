'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Home, Sparkles } from 'lucide-react'
import type { CategoryReport, GapGrade } from '@/types'

interface AnalysisResult {
  summary: string
  grade: GapGrade
  categoryReports: CategoryReport[]
}

const GRADE_CONFIG: Record<GapGrade, { label: string; color: string; bgColor: string; borderColor: string }> = {
  excellent: {
    label: 'すごく良い関係！引き続きその調子！',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  good: {
    label: '良好な関係！何かあれば話し合おう！',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200'
  },
  caution: {
    label: 'これを機に話し合ってみると良いかも！',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  attention: {
    label: 'お互いの考えを共有する時間を作る必要がありそう！',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200'
  },
}

const getStatusBadgeStyle = (status: string) => {
  if (status.includes('すごく良い関係')) return 'bg-teal-100 text-teal-800 border-teal-300'
  if (status.includes('良好な関係')) return 'bg-cyan-100 text-cyan-800 border-cyan-300'
  if (status.includes('話し合ってみると良いかも')) return 'bg-amber-100 text-amber-800 border-amber-300'
  return 'bg-rose-100 text-rose-800 border-rose-300'
}

export default function ResultPage() {
  const router = useRouter()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedResult = localStorage.getItem('notify_result')
    if (savedResult) {
      setResult(JSON.parse(savedResult))
    } else {
      router.push('/')
    }
    setIsLoading(false)
  }, [router])

  const handleRestart = () => {
    localStorage.removeItem('notify_game_state')
    localStorage.removeItem('notify_result')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-3xl">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const gradeConfig = GRADE_CONFIG[result.grade] || GRADE_CONFIG.caution

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ヘッダー */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">診断結果</CardTitle>
            <CardDescription className="text-base">お二人の関係性を分析しました</CardDescription>
          </CardHeader>
        </Card>

        {/* 総合評価 */}
        <Card className={`border-2 ${gradeConfig.borderColor} shadow-lg`}>
          <CardHeader className={gradeConfig.bgColor}>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className={`h-5 w-5 ${gradeConfig.color}`} />
              総合評価
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`mb-6 rounded-lg ${gradeConfig.bgColor} p-4 text-center border-2 ${gradeConfig.borderColor}`}>
              <p className={`text-2xl font-bold ${gradeConfig.color}`}>{gradeConfig.label}</p>
            </div>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{result.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* カテゴリー別レポート */}
        {result.categoryReports && result.categoryReports.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-indigo-500"></div>
              カテゴリー別分析
            </h2>
            {result.categoryReports.map((report, index) => (
              <Card key={index} className="border-2 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-800">
                      {report.categoryName}
                    </CardTitle>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeStyle(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{report.report}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 次のステップ */}
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50">
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">💡 次のステップ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>このメッセージをきっかけに、お互いの気持ちを話し合ってみましょう</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>相手の考えを否定せず、まずは理解しようとする姿勢が大切です</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>定期的に診断を受けることで、関係性の変化を確認できます</span>
              </li>
            </ul>

            <div className="border-t border-indigo-200 pt-4">
              <p className="text-sm text-gray-700 mb-3">
                使ってみた感想をいただけると嬉しいです！今後のサービス改善に役立てさせていただきます。
              </p>
              <a
                href="https://forms.gle/KFw5t9xcQAyBSoWo8"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-700"
                >
                  感想を送る
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* アクション */}
        <Card className="border-2">
          <CardContent className="p-6">
            <Button onClick={handleRestart} className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700" size="lg">
              <Home className="mr-2 h-5 w-5" />
              トップに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
