'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Home } from 'lucide-react'
import type { GapGrade, CategoryReport } from '@/types'
import { useRouter } from 'next/navigation'

interface ResultDisplayProps {
  summary: string
  grade: GapGrade
  categoryReports?: CategoryReport[]
}

const GRADE_CONFIG: Record<
  GapGrade,
  {
    label: string
    color: string
    bgColor: string
    description: string
    scoreRange: string
  }
> = {
  excellent: {
    label: '非常に良好',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    description: 'お二人の認識はほぼ一致しています',
    scoreRange: '90〜100点',
  },
  good: {
    label: '良好',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    description: '小さなすれ違いがあるようです',
    scoreRange: '80〜89点',
  },
  caution: {
    label: 'すれ違いの可能性あり',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    description: 'いくつか話し合いたいポイントがあります',
    scoreRange: '60〜79点',
  },
  attention: {
    label: '話し合いの必要あり',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    description: 'じっくり話し合う時間を作りましょう',
    scoreRange: '20〜59点',
  },
}

export function ResultDisplay({ summary, grade, categoryReports }: ResultDisplayProps) {
  const router = useRouter()
  const gradeInfo = GRADE_CONFIG[grade]

  const getStatusColor = (status: string) => {
    if (status.includes('非常に良好')) return 'text-blue-700 bg-blue-50'
    if (status.includes('良好')) return 'text-blue-700 bg-blue-50'
    if (status.includes('すれ違い')) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  return (
    <Card className="w-full max-w-3xl border-2 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500">
          <Award className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl">診断結果</CardTitle>
        <CardDescription>お二人の関係性レポート</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`rounded-lg ${gradeInfo.bgColor} p-6 text-center`}>
          <div className={`text-4xl font-bold ${gradeInfo.color}`}>{gradeInfo.label}</div>
          <p className="mt-2 text-sm text-gray-600">{gradeInfo.description}</p>
        </div>

        <div className="space-y-3 rounded-lg border-2 border-muted p-6">
          <h3 className="font-semibold text-gray-800">全体サマリー</h3>
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{summary}</p>
        </div>

        {categoryReports && categoryReports.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">カテゴリー別分析</h3>
            {categoryReports
              .filter((report) => report.category !== 'self_assessment')
              .map((report) => (
                <div
                  key={report.category}
                  className="space-y-2 rounded-lg border-2 border-muted p-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">{report.categoryName}</h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(report.status)}`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {report.report}
                  </p>
                </div>
              ))}
          </div>
        )}

        <div className="rounded-lg bg-indigo-50 p-4 text-sm text-gray-700">
          <p className="font-medium">次のステップ</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• このメッセージをきっかけに、お互いの気持ちを話し合ってみましょう</li>
            <li>• 相手の考えを否定せず、まずは理解しようとする姿勢が大切です</li>
            <li>• 定期的に診断を受けることで、関係性の変化を確認できます</li>
          </ul>
        </div>

        <Button
          onClick={() => router.push('/')}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <Home className="mr-2 h-4 w-4" />
          トップページに戻る
        </Button>
      </CardContent>
    </Card>
  )
}
