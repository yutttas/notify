// Database types
export type RoomStatus = 'waiting' | 'completed'
export type UserType = 'host' | 'guest'
export type GapGrade = 'excellent' | 'good' | 'caution' | 'attention'

// Category types
export type CategoryType = 'vision' | 'operation' | 'communication' | 'trust'

export interface CategoryReport {
  category: CategoryType
  categoryName: string
  status: string
  report: string
}

export interface Room {
  id: string
  status: RoomStatus
  summary_report: string | null
  gap_grade: GapGrade | null
  category_reports: CategoryReport[] | null
  created_at: string
  updated_at: string
}

export interface Answer {
  id: string
  room_id: string
  user_type: UserType
  answers: Record<string, number> // { "q1": 4, "q2": 3, ... }
  created_at: string
  updated_at: string
}

// UI types
export interface Question {
  id: string
  text: string
  order: number
  category: CategoryType
}

export interface QuestionAnswer {
  questionId: string
  score: number // 1-5
}

export interface AnalysisResult {
  summary: string
  grade: GapGrade
}
