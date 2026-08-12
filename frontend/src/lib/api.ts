import type { CompareResponse } from '../types/compare'

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
