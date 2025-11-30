import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-2 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-purple-300">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Notify</CardTitle>
          <CardDescription className="mt-2 text-base text-gray-600">
            夫婦のすれ違い診断
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm text-gray-700">
            <p>10問の設問に、それぞれ回答してください。</p>
            <p>AIがお二人のすれ違いをマイルドに指摘し、話し合いのきっかけを作ります。</p>
            <p className="text-xs text-muted-foreground">※スマホを交代しながら回答してください</p>
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
