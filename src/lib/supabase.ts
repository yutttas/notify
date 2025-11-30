import { createClient } from '@supabase/supabase-js'
import type { Room, Answer } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Supabase環境変数が設定されていません。Vercelの環境変数設定でNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。'
  console.error('[supabase]', errorMsg)
  throw new Error(errorMsg)
}

console.log('[supabase] Supabase client initialized successfully with URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: Room
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Room, 'id' | 'created_at' | 'updated_at'>>
      }
      answers: {
        Row: Answer
        Insert: Omit<Answer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Answer, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
