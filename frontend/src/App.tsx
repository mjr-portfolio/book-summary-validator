import { useRef, useState } from 'react'
import BookLookupForm from './components/ui/BookLookupForm'
import ImageUpload from './components/ui/ImageUpload'
import ModeToggle from './components/ui/ModeToggle'
import { compareTexts, extractTextFromImage, lookupBookText } from './lib/api'
import { compressImage } from './lib/compressImage'
import type { CompareResponse } from './types/compare'

type InputMode = 'text' | 'image' | 'lookup'

const App = () => {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [bookText, setBookText] = useState('')
  const [bookImage, setBookImage] = useState<File | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [chapterSectionName, setChapterSectionName] = useState('')
  const [extractedBookText, setExtractedBookText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [userSummary, setUserSummary] = useState('')
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const extractionRequestId = useRef(0)

  const canEnterChapterSection =
    bookTitle.trim().length > 0 && author.trim().length > 0

  const canCompare =
    userSummary.trim().length > 0 &&
    (inputMode === 'text'
      ? bookText.trim().length > 0
      : extractedBookText.trim().length > 0 && !isExtracting)

  const resetExtractionState = () => {
    extractionRequestId.current += 1
    setExtractedBookText('')
    setExtractionError(null)
    setIsExtracting(false)
  }

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode)
    resetExtractionState()
  }

  const handleImageSelected = async (file: File | null) => {
    setBookImage(file)
    setExtractedBookText('')
    setExtractionError(null)
    setResult(null)
    setError(null)

    if (!file) {
      setIsExtracting(false)
      return
    }

    const requestId = ++extractionRequestId.current
    setIsExtracting(true)

    try {
      const compressed = await compressImage(file)
      const extractedText = await extractTextFromImage(compressed)

      if (requestId !== extractionRequestId.current) {
        return
      }

      setExtractedBookText(extractedText)
    } catch (err) {
      if (requestId !== extractionRequestId.current) {
        return
      }

      setExtractionError(
        err instanceof Error ? err.message : 'Failed to scan text from image. Please try again.',
      )
    } finally {
      if (requestId === extractionRequestId.current) {
        setIsExtracting(false)
      }
    }
  }

  const handleBookTitleChange = (value: string) => {
    setBookTitle(value)
    resetExtractionState()

    const nextCanEnter =
      value.trim().length > 0 && author.trim().length > 0
    if (!nextCanEnter) {
      setChapterSectionName('')
    }
  }

  const handleAuthorChange = (value: string) => {
    setAuthor(value)
    resetExtractionState()

    const nextCanEnter =
      bookTitle.trim().length > 0 && value.trim().length > 0
    if (!nextCanEnter) {
      setChapterSectionName('')
    }
  }

  const handleChapterSectionNameChange = (value: string) => {
    if (!canEnterChapterSection) {
      return
    }

    setChapterSectionName(value)
    resetExtractionState()
  }

  const handleChapterSectionNameBlur = async () => {
    const title = bookTitle.trim()
    const authorName = author.trim()
    const sectionName = chapterSectionName.trim()

    if (!title || !authorName || !sectionName || !canEnterChapterSection) {
      return
    }

    const requestId = ++extractionRequestId.current
    setIsExtracting(true)
    setExtractionError(null)
    setExtractedBookText('')
    setResult(null)
    setError(null)

    try {
      const summary = await lookupBookText(title, authorName, sectionName)

      if (requestId !== extractionRequestId.current) {
        return
      }

      setExtractedBookText(summary)
    } catch (err) {
      if (requestId !== extractionRequestId.current) {
        return
      }

      setExtractionError(
        err instanceof Error ? err.message : 'Failed to fetch chapter summary. Please try again.',
      )
    } finally {
      if (requestId === extractionRequestId.current) {
        setIsExtracting(false)
      }
    }
  }

  const handleCompare = async () => {
    if (!canCompare || isLoading) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const sourceText = inputMode === 'text' ? bookText : extractedBookText
      const response = await compareTexts(sourceText, userSummary)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Book Summary Validator
          </h1>
          <p className="mt-2 text-gray-600">
            Paste text, scan a photo, or look up a chapter or section, then compare it with your
            personal summary.
          </p>
        </header>

        <ModeToggle mode={inputMode} onChange={handleModeChange} />

        <div className="grid gap-6 lg:grid-cols-2">
          {inputMode === 'text' ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">Book Source Text</span>
              <textarea
                value={bookText}
                onChange={(e) => setBookText(e.target.value)}
                placeholder="Paste an excerpt or chapter from the book..."
                rows={14}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
          ) : inputMode === 'image' ? (
            <ImageUpload
              file={bookImage}
              onFileChange={handleImageSelected}
              disabled={isLoading}
              isExtracting={isExtracting}
              extractionError={extractionError}
              isExtracted={Boolean(extractedBookText) && !isExtracting}
            />
          ) : (
            <BookLookupForm
              bookTitle={bookTitle}
              author={author}
              chapterSectionName={chapterSectionName}
              onBookTitleChange={handleBookTitleChange}
              onAuthorChange={handleAuthorChange}
              onChapterSectionNameChange={handleChapterSectionNameChange}
              onChapterSectionNameBlur={handleChapterSectionNameBlur}
              disabled={isLoading}
              isExtracting={isExtracting}
              extractionError={extractionError}
              isExtracted={Boolean(extractedBookText) && !isExtracting}
            />
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">User Summary</span>
            <textarea
              value={userSummary}
              onChange={(e) => setUserSummary(e.target.value)}
              placeholder="Paste your summary of the book/section here..."
              rows={14}
              className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleCompare}
            disabled={!canCompare || isLoading}
            className="rounded-lg bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isLoading ? 'AI evaluating summary...' : 'Compare'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
          >
            {error}
          </div>
        )}

        {result && (
          <section
            aria-live="polite"
            className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">Results</h2>
            <p className="mt-3 text-4xl font-bold text-indigo-600">
              {result.match_percentage.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-gray-500">Conceptual match</p>
            <p className="mt-4 text-gray-700">{result.critique}</p>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
