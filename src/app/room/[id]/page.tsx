import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getRoom } from '@/actions/room'
import { getAnswers } from '@/actions/answer'
import { QuestionForm } from '@/components/QuestionForm'
import { WaitingRoom } from '@/components/WaitingRoom'
import type { UserType } from '@/types'

interface RoomPageProps {
  params: Promise<{ id: string }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id: roomId } = await params
  const cookieStore = await cookies()

  // Roomの存在確認
  const roomResult = await getRoom(roomId)
  if (!roomResult.success || !roomResult.room) {
    redirect('/')
  }

  const room = roomResult.room

  // 既に完了している場合は結果ページへ
  if (room.status === 'completed') {
    redirect(`/room/${roomId}/result`)
  }

  // 既存の回答を取得
  const answersResult = await getAnswers(roomId)
  const answers = answersResult.success ? answersResult.answers || [] : []

  // ユーザータイプの判定
  const userTypeCookie = cookieStore.get(`room_${roomId}_user_type`)
  let userType: UserType

  if (userTypeCookie) {
    userType = userTypeCookie.value as UserType
  } else {
    // 初回訪問: 回答がない人が誰かを判定
    const hasHost = answers.some((a) => a.user_type === 'host')
    const hasGuest = answers.some((a) => a.user_type === 'guest')

    // 誰も回答していない、またはhostのみ回答済みの場合
    if (!hasHost) {
      userType = 'host'
    } else if (!hasGuest) {
      userType = 'guest'
    } else {
      // 両方いる場合（通常は発生しないはず）
      userType = 'guest'
    }
  }

  // 自分が回答済みかチェック
  const hasAnswered = answers.some((a) => a.user_type === userType)

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      {hasAnswered ? (
        <WaitingRoom roomId={roomId} answersCount={answers.length} />
      ) : (
        <>
          <QuestionForm roomId={roomId} userType={userType} />
          <script
            dangerouslySetInnerHTML={{
              __html: `document.cookie = "room_${roomId}_user_type=${userType}; path=/; max-age=86400; SameSite=Lax";`,
            }}
          />
        </>
      )}
    </div>
  )
}
