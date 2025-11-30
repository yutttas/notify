'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Copy, UserCheck, Users } from 'lucide-react'
import { getRoom } from '@/actions/room'

interface WaitingRoomProps {
  roomId: string
  answersCount: number
}

export function WaitingRoom({ roomId, answersCount }: WaitingRoomProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : ''

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  useEffect(() => {
    const checkRoomStatus = async () => {
      const result = await getRoom(roomId)
      if (result.success && result.room?.status === 'completed') {
        router.push(`/room/${roomId}/result`)
      }
    }

    const interval = setInterval(checkRoomStatus, 3000)
    return () => clearInterval(interval)
  }, [roomId, router])

  return (
    <Card className="w-full max-w-2xl border-2 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-300 to-emerald-300">
          <UserCheck className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">回答を受け付けました</CardTitle>
        <CardDescription>次はパートナーの番です</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 rounded-lg bg-muted/50 p-6">
            <Users className="h-6 w-6 text-muted-foreground" />
            <span className="text-lg font-medium">
              {answersCount} / 2 人が回答済み
            </span>
          </div>

          <div className="space-y-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4">
            <p className="text-sm font-medium text-muted-foreground">診断ルームのURL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-sm">
                {roomUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
            <p className="font-medium">パートナーにURLを共有してスタートしてもらってください</p>
            <p className="mt-1 text-xs text-gray-600">
              お二人とも回答が完了すると、自動的に結果ページに移動します。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
