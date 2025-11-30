'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { Room, CategoryReport } from '@/types'

export async function createRoom(): Promise<{ success: boolean; roomId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        status: 'waiting',
        summary_report: null,
        gap_grade: null,
      })
      .select()
      .single()

    if (error) {
      console.error('Room creation error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, roomId: data.id }
  } catch (error) {
    console.error('Unexpected error creating room:', error)
    return { success: false, error: '診断ルームの作成に失敗しました。' }
  }
}

export async function getRoom(roomId: string): Promise<{ success: boolean; room?: Room; error?: string }> {
  try {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single()

    if (error) {
      console.error('Room fetch error:', error)
      return { success: false, error: error.message }
    }

    // データをプレーンオブジェクトに変換してシリアライゼーションを確実にする
    return { success: true, room: data ? JSON.parse(JSON.stringify(data)) : undefined }
  } catch (error) {
    console.error('Unexpected error fetching room:', error)
    return { success: false, error: 'ルーム情報の取得に失敗しました。' }
  }
}

export async function updateRoom(
  roomId: string,
  updates: { status?: string; summary_report?: string; gap_grade?: string; category_reports?: CategoryReport[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('rooms').update(updates).eq('id', roomId)

    if (error) {
      console.error('Room update error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/room/${roomId}`)
    revalidatePath(`/room/${roomId}/result`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating room:', error)
    return { success: false, error: 'ルーム情報の更新に失敗しました。' }
  }
}
