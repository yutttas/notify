import { redirect } from 'next/navigation'
import { getRoom } from '@/actions/room'
import { ResultDisplay } from '@/components/ResultDisplay'

interface ResultPageProps {
  params: Promise<{ id: string }>
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id: roomId } = await params

  const roomResult = await getRoom(roomId)

  if (!roomResult.success || !roomResult.room) {
    redirect('/')
  }

  const room = roomResult.room

  // まだ完了していない場合は診断ページへ
  if (room.status !== 'completed' || !room.summary_report || !room.gap_grade) {
    redirect(`/room/${roomId}`)
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-8">
      <ResultDisplay
        summary={room.summary_report}
        grade={room.gap_grade}
        categoryReports={room.category_reports || undefined}
      />
    </div>
  )
}
