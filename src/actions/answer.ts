'use server'

import { supabase } from '@/lib/supabase'
import { analyzeCoupleDifferences } from '@/lib/openai'
import { updateRoom } from './room'
import { revalidatePath } from 'next/cache'
import type { Answer, UserType } from '@/types'
import { QUESTIONS } from '@/constants/questions'

// Vercel環境でのタイムアウトを60秒に設定
export const maxDuration = 60

export async function submitAnswer(
  roomId: string,
  userType: UserType,
  answers: Record<string, number>
): Promise<{ success: boolean; shouldShowResult?: boolean; error?: string }> {
  try {
    console.log('[submitAnswer] Starting submission for room:', roomId, 'userType:', userType)

    // 回答を保存
    const { error: insertError } = await supabase.from('answers').insert({
      room_id: roomId,
      user_type: userType,
      answers,
    })

    if (insertError) {
      console.error('[submitAnswer] Answer insert error:', insertError)
      return { success: false, error: `回答の保存に失敗しました: ${insertError.message}` }
    }

    console.log('[submitAnswer] Answer saved successfully')

    // 両方の回答があるかチェック
    const { data: allAnswers, error: fetchError } = await supabase
      .from('answers')
      .select('*')
      .eq('room_id', roomId)

    if (fetchError) {
      console.error('[submitAnswer] Answers fetch error:', fetchError)
      return { success: false, error: `回答の取得に失敗しました: ${fetchError.message}` }
    }

    console.log('[submitAnswer] Total answers found:', allAnswers?.length || 0)

    // 2人とも回答済みの場合、AIで分析
    if (allAnswers && allAnswers.length === 2) {
      const hostAnswer = allAnswers.find((a) => a.user_type === 'host')
      const guestAnswer = allAnswers.find((a) => a.user_type === 'guest')

      if (hostAnswer && guestAnswer) {
        console.log('[submitAnswer] Both answers present, starting AI analysis')

        try {
          // OpenAI APIで分析
          const result = await analyzeCoupleDifferences(
            hostAnswer.answers as Record<string, number>,
            guestAnswer.answers as Record<string, number>,
            QUESTIONS
          )

          console.log('[submitAnswer] AI analysis completed successfully')

          // Roomを更新
          const updateResult = await updateRoom(roomId, {
            status: 'completed',
            summary_report: result.summary,
            gap_grade: result.grade,
            category_reports: result.categoryReports,
          })

          if (!updateResult.success) {
            console.error('[submitAnswer] Room update failed:', updateResult.error)
            return { success: false, error: `結果の保存に失敗しました: ${updateResult.error}` }
          }

          console.log('[submitAnswer] Room updated successfully')

          revalidatePath(`/room/${roomId}`)
          revalidatePath(`/room/${roomId}/result`)

          return { success: true, shouldShowResult: true }
        } catch (aiError) {
          console.error('[submitAnswer] AI analysis error:', aiError)
          const errorMessage = aiError instanceof Error ? aiError.message : String(aiError)
          return { success: false, error: `分析処理に失敗しました: ${errorMessage}` }
        }
      }
    }

    console.log('[submitAnswer] Waiting for partner to complete')
    revalidatePath(`/room/${roomId}`)
    return { success: true, shouldShowResult: false }
  } catch (error) {
    console.error('[submitAnswer] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: `回答の送信に失敗しました: ${errorMessage}` }
  }
}

export async function getAnswers(
  roomId: string
): Promise<{ success: boolean; answers?: Answer[]; error?: string }> {
  try {
    const { data, error } = await supabase.from('answers').select('*').eq('room_id', roomId)

    if (error) {
      console.error('Answers fetch error:', error)
      return { success: false, error: error.message }
    }

    // データをプレーンオブジェクトに変換してシリアライゼーションを確実にする
    return { success: true, answers: data ? JSON.parse(JSON.stringify(data)) : undefined }
  } catch (error) {
    console.error('Unexpected error fetching answers:', error)
    return { success: false, error: '回答の取得に失敗しました。' }
  }
}

export async function hasUserAnswered(
  roomId: string,
  userType: UserType
): Promise<{ success: boolean; hasAnswered?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('answers')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_type', userType)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Answer check error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, hasAnswered: !!data }
  } catch (error) {
    console.error('Unexpected error checking answer:', error)
    return { success: false, error: '回答状況の確認に失敗しました。' }
  }
}
