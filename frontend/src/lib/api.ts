import type {
  CompareResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  GradeAnswersRequest,
  GradeAnswersResponse,
} from '../types/compare'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const parseErrorResponse = async (response: Response, fallback: string): Promise<string> => {
  try {
    const errorBody = (await response.json()) as { detail?: string }
    if (errorBody.detail) {
      return errorBody.detail
    }
  } catch {
    // Keep fallback when error body is not JSON
  }
  return fallback
}

const parseCompareResponse = async (response: Response): Promise<CompareResponse> => {
  if (!response.ok) {
    throw new Error(
      await parseErrorResponse(response, `Compare request failed with status ${response.status}`),
    )
  }

  const data = (await response.json()) as CompareResponse

  if (
    typeof data.match_percentage !== 'number' ||
    Number.isNaN(data.match_percentage) ||
    typeof data.critique !== 'string' ||
    !data.critique.trim()
  ) {
    throw new Error('Compare response was missing required result fields')
  }

  return data
}

const parseGenerateQuestionsResponse = async (
  response: Response,
): Promise<GenerateQuestionsResponse> => {
  if (!response.ok) {
    throw new Error(
      await parseErrorResponse(
        response,
        `Generate questions request failed with status ${response.status}`,
      ),
    )
  }

  const data = (await response.json()) as GenerateQuestionsResponse

  if (
    !Array.isArray(data.questions) ||
    data.questions.length !== 3 ||
    data.questions.some((item) => typeof item?.question !== 'string' || !item.question.trim())
  ) {
    throw new Error('Generate questions response was missing required question fields')
  }

  return data
}

const parseGradeAnswersResponse = async (response: Response): Promise<GradeAnswersResponse> => {
  if (!response.ok) {
    throw new Error(
      await parseErrorResponse(
        response,
        `Grade answers request failed with status ${response.status}`,
      ),
    )
  }

  const data = (await response.json()) as GradeAnswersResponse

  if (
    !Array.isArray(data.results) ||
    data.results.length !== 3 ||
    typeof data.correct_count !== 'number' ||
    data.results.some(
      (item) =>
        typeof item?.is_correct !== 'boolean' ||
        typeof item?.feedback !== 'string' ||
        !item.feedback.trim() ||
        typeof item?.hint !== 'string' ||
        !item.hint.trim(),
    )
  ) {
    throw new Error('Grade answers response was missing required result fields')
  }

  return data
}

export const compareTexts = async (
  bookText: string,
  userSummary: string,
): Promise<CompareResponse> => {
  const formData = new FormData()
  formData.append('book_text', bookText.trim())
  formData.append('user_summary', userSummary.trim())

  const response = await fetch(`${API_BASE_URL}/api/compare`, {
    method: 'POST',
    body: formData,
  })

  return parseCompareResponse(response)
}

export const extractTextFromImage = async (imageBlob: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('image', imageBlob, 'scan.jpg')

  const response = await fetch(`${API_BASE_URL}/api/extract-text`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(
      await parseErrorResponse(response, `Text extraction failed with status ${response.status}`),
    )
  }

  const data = (await response.json()) as { extracted_text?: string }

  if (!data.extracted_text?.trim()) {
    throw new Error('Text extraction response was missing extracted text')
  }

  return data.extracted_text.trim()
}

export const lookupBookText = async (
  bookTitle: string,
  author: string,
  chapterOrSectionName: string,
): Promise<string> => {
  const formData = new FormData()
  formData.append('book_title', bookTitle.trim())
  formData.append('author', author.trim())
  formData.append('chapter_or_section_name', chapterOrSectionName.trim())

  const response = await fetch(`${API_BASE_URL}/api/lookup-text`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(
      await parseErrorResponse(response, `Book lookup failed with status ${response.status}`),
    )
  }

  const data = (await response.json()) as { extracted_text?: string }

  if (!data.extracted_text?.trim()) {
    throw new Error('Book lookup response was missing extracted text')
  }

  return data.extracted_text.trim()
}

export const scrapeUrl = async (url: string, sectionFilter: string): Promise<string> => {
  const formData = new FormData()
  formData.append('url', url.trim())
  formData.append('section_filter', sectionFilter.trim())

  const response = await fetch(`${API_BASE_URL}/api/scrape-url`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(
      await parseErrorResponse(response, `URL scrape failed with status ${response.status}`),
    )
  }

  const data = (await response.json()) as { extracted_text?: string }

  if (!data.extracted_text?.trim()) {
    throw new Error('URL scrape response was missing extracted text')
  }

  return data.extracted_text.trim()
}

export const generateQuestions = async (
  payload: GenerateQuestionsRequest,
): Promise<GenerateQuestionsResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_text: payload.source_text.trim(),
      critique: payload.critique.trim(),
      quiz_type: payload.quiz_type,
      difficulty: payload.difficulty,
      exclusion_history: payload.exclusion_history ?? [],
    }),
  })

  return parseGenerateQuestionsResponse(response)
}

export const gradeAnswers = async (
  payload: GradeAnswersRequest,
): Promise<GradeAnswersResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/grade-answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_text: payload.source_text.trim(),
      questions: payload.questions.map((question) => question.trim()),
      answers: payload.answers.map((answer) => answer.trim()),
    }),
  })

  return parseGradeAnswersResponse(response)
}
