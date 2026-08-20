export interface CompareRequest {
  book_text: string
  user_summary: string
}

export interface CompareResponse {
  match_percentage: number
  critique: string
}

export type QuizType = 'remedial' | 'mastery'
export type QuizDifficulty = 'standard' | 'advanced' | 'professional'

export interface StudyQuestion {
  question: string
}

export interface GenerateQuestionsRequest {
  source_text: string
  critique: string
  quiz_type: QuizType
  difficulty: QuizDifficulty
  exclusion_history?: string[]
}

export interface GenerateQuestionsResponse {
  questions: StudyQuestion[]
}

export interface GradeAnswersRequest {
  source_text: string
  questions: string[]
  answers: string[]
}

export interface GradeAnswerResult {
  is_correct: boolean
  feedback: string
  hint: string
}

export interface GradeAnswersResponse {
  results: GradeAnswerResult[]
  correct_count: number
}
