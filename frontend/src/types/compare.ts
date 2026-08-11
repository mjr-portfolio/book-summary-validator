export interface CompareRequest {
  book_text: string
  user_summary: string
}

export interface CompareResponse {
  match_percentage: number
  critique: string
}
