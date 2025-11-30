import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// カスタムロゴアイコン: 2つの吹き出しが重なり、共通部分に電球
function NotifyLogo() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-20 w-20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 左の吹き出し */}
      <path
        d="M25 35C25 26.7157 31.7157 20 40 20H55C63.2843 20 70 26.7157 70 35V50C70 58.2843 63.2843 65 55 65H40C31.7157 65 25 58.2843 25 50V35Z"
        fill="#F9A8D4"
        opacity="0.8"
      />
      <path
        d="M35 65L30 75L40 68"
        fill="#F9A8D4"
        opacity="0.8"
      />

      {/* 右の吹き出し */}
      <path
        d="M45 30C45 21.7157 51.7157 15 60 15H75C83.2843 15 90 21.7157 90 30V45C90 53.2843 83.2843 60 75 60H60C51.7157 60 45 53.2843 45 45V30Z"
        fill="#D8B4FE"
        opacity="0.8"
      />
      <path
        d="M75 60L80 70L70 63"
        fill="#D8B4FE"
        opacity="0.8"
      />

      {/* 中央の電球（共通部分） */}
      <circle cx="57.5" cy="37.5" r="8" fill="#FCD34D" />
      <path
        d="M54 45C54 45 54 47 54 48C54 49.1046 54.8954 50 56 50H59C60.1046 50 61 49.1046 61 48C61 47 61 45 61 45"
        stroke="#FCD34D"
        strokeWidth="2"
        fill="none"
      />
      <line x1="57.5" y1="29.5" x2="57.5" y2="26" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="65.5" y1="31.5" x2="68" y2="29" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="49.5" y1="31.5" x2="47" y2="29" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-2 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <NotifyLogo />
          </div>
          <CardTitle className="text-5xl font-bold text-gray-800">Notify</CardTitle>
          <CardDescription className="mt-2 text-base text-gray-600">
            夫婦の関係性診断
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-lg bg-muted/50 p-5 text-sm text-gray-700">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">サービス概要</h3>
              <p>10問の設問にそれぞれ回答いただくことで、AIがお二人の状況をマイルドに診断し、関係を振り返るきっかけを作ります。</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800">使い方</h3>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>「診断を始める」をタップして、まず<strong>あなた自身</strong>が10問の質問に回答します</li>
                <li>回答が完了したら、スマホを<strong>パートナーに渡して</strong>ください</li>
                <li>パートナーが同じ10問に回答します</li>
                <li>お二人の回答が完了すると、AIが診断結果を表示します</li>
              </ol>
            </div>

            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                ⚠️ 診断内容はAI分析に基づくものです。あくまで一つの意見として参考にしてください。
              </p>
              <p className="text-xs text-muted-foreground">
                🔒 回答内容やスコアはお互いに見えることはありませんので、安心して正直に回答してください。
              </p>
            </div>
          </div>

          <Link href="/diagnosis">
            <Button className="w-full py-6 text-lg font-semibold" size="lg">
              診断を始める
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
