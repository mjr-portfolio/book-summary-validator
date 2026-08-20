import { useEffect, useRef, useState } from 'react'
import AdaptiveQuizCard from './components/ui/AdaptiveQuizCard'
import BookLookupForm from './components/ui/BookLookupForm'
import ImageUpload from './components/ui/ImageUpload'
import ModeToggle from './components/ui/ModeToggle'
import StudyQuiz from './components/ui/StudyQuiz'
import UrlArticleForm from './components/ui/UrlArticleForm'
import {
  compareTexts,
  extractTextFromImage,
  generateQuestions,
  gradeAnswers,
  lookupBookText,
  scrapeUrl,
} from './lib/api'
import { compressImage } from './lib/compressImage'
import type {
  CompareResponse,
  GradeAnswerResult,
  QuizDifficulty,
  StudyQuestion,
} from './types/compare'

type InputMode = 'text' | 'image' | 'lookup' | 'url'

const emptyAnswers = (): string[] => ['', '', '']

const App = () => {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [bookText, setBookText] = useState('')
  const [bookImage, setBookImage] = useState<File | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [chapterSectionName, setChapterSectionName] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
  const [articleSectionFilter, setArticleSectionFilter] = useState('')
  const [extractedBookText, setExtractedBookText] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [userSummary, setUserSummary] = useState('')
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const extractionRequestId = useRef(0)
  const resultsRef = useRef<HTMLElement | null>(null)
  const quizRef = useRef<HTMLDivElement | null>(null)

  const [askedQuestionHistory, setAskedQuestionHistory] = useState<string[]>([])
  const [quizQuestions, setQuizQuestions] = useState<StudyQuestion[] | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<string[]>(emptyAnswers)
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('standard')
  const [gradeResults, setGradeResults] = useState<GradeAnswerResult[] | null>(null)
  const [correctCount, setCorrectCount] = useState<number | null>(null)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [isGradingQuiz, setIsGradingQuiz] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [quizValidationError, setQuizValidationError] = useState<string | null>(null)

  const canEnterChapterSection =
    bookTitle.trim().length > 0 && author.trim().length > 0

  const canEnterArticleSectionFilter = articleUrl.trim().length > 0

  const canCompare =
    userSummary.trim().length > 0 &&
    (inputMode === 'text'
      ? bookText.trim().length > 0
      : extractedBookText.trim().length > 0 && !isExtracting)

  const currentSourceText = inputMode === 'text' ? bookText : extractedBookText
  const quizType = result && result.match_percentage < 70 ? 'remedial' : 'mastery'

  useEffect(() => {
    if (!result) return
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  useEffect(() => {
    if (!quizQuestions) return
    quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [quizQuestions])

  const resetQuizState = () => {
    setAskedQuestionHistory([])
    setQuizQuestions(null)
    setQuizAnswers(emptyAnswers())
    setQuizDifficulty('standard')
    setGradeResults(null)
    setCorrectCount(null)
    setIsGeneratingQuiz(false)
    setIsGradingQuiz(false)
    setQuizError(null)
    setQuizValidationError(null)
  }

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
    resetQuizState()

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
    resetQuizState()

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

  const handleArticleUrlChange = (value: string) => {
    setArticleUrl(value)
    resetExtractionState()

    if (!value.trim()) {
      setArticleSectionFilter('')
    }
  }

  const handleArticleSectionFilterChange = (value: string) => {
    if (!canEnterArticleSectionFilter) {
      return
    }

    setArticleSectionFilter(value)
    resetExtractionState()
  }

  const handleArticleSectionFilterBlur = async () => {
    const url = articleUrl.trim()
    const sectionFilter = articleSectionFilter.trim()

    if (!url || !sectionFilter || !canEnterArticleSectionFilter) {
      return
    }

    const requestId = ++extractionRequestId.current
    setIsExtracting(true)
    setExtractionError(null)
    setExtractedBookText('')
    setResult(null)
    setError(null)
    resetQuizState()

    try {
      const scrapedText = await scrapeUrl(url, sectionFilter)

      if (requestId !== extractionRequestId.current) {
        return
      }

      setExtractedBookText(scrapedText)
    } catch (err) {
      if (requestId !== extractionRequestId.current) {
        return
      }

      setExtractionError(
        err instanceof Error
          ? err.message
          : 'Failed to scrape article section. Please try again.',
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
    resetQuizState()

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

  const runGenerateQuestions = async (exclusionHistory: string[]) => {
    if (!result) return

    setIsGeneratingQuiz(true)
    setQuizError(null)
    setQuizValidationError(null)
    setGradeResults(null)
    setCorrectCount(null)

    try {
      const response = await generateQuestions({
        source_text: currentSourceText,
        critique: result.critique,
        quiz_type: quizType,
        difficulty: quizType === 'remedial' ? 'standard' : quizDifficulty,
        exclusion_history: exclusionHistory,
      })
      setQuizQuestions(response.questions)
      setQuizAnswers(emptyAnswers())
    } catch (err) {
      setQuizError(
        err instanceof Error ? err.message : 'Failed to generate study questions. Please try again.',
      )
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (isGeneratingQuiz || !result) return
    await runGenerateQuestions(askedQuestionHistory)
  }

  const handleRegenerateQuiz = async () => {
    if (isGeneratingQuiz || isGradingQuiz || !quizQuestions || !result) return

    const nextHistory = [...askedQuestionHistory, ...quizQuestions.map((item) => item.question)]
    const truncatedHistory = nextHistory.length > 10 ? nextHistory.slice(-10) : nextHistory
    setAskedQuestionHistory(truncatedHistory)
    await runGenerateQuestions(truncatedHistory)
  }

  const handleAnswerChange = (index: number, value: string) => {
    setQuizAnswers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    setQuizValidationError(null)
  }

  const handleSubmitAnswers = async () => {
    if (isGradingQuiz || isGeneratingQuiz || !quizQuestions) return

    if (quizAnswers.some((answer) => !answer.trim())) {
      setQuizValidationError('Please answer all three questions before submitting.')
      return
    }

    setIsGradingQuiz(true)
    setQuizError(null)
    setQuizValidationError(null)

    try {
      const response = await gradeAnswers({
        source_text: currentSourceText,
        questions: quizQuestions.map((item) => item.question),
        answers: quizAnswers,
      })
      setGradeResults(response.results)
      setCorrectCount(response.correct_count)
    } catch (err) {
      setQuizError(
        err instanceof Error ? err.message : 'Failed to grade answers. Please try again.',
      )
    } finally {
      setIsGradingQuiz(false)
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
            Paste text, scan a photo, look up a chapter, or scrape an article link, then compare it
            with your personal summary.
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
          ) : inputMode === 'lookup' ? (
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
          ) : (
            <UrlArticleForm
              url={articleUrl}
              sectionFilter={articleSectionFilter}
              onUrlChange={handleArticleUrlChange}
              onSectionFilterChange={handleArticleSectionFilterChange}
              onSectionFilterBlur={handleArticleSectionFilterBlur}
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
            ref={resultsRef}
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

        {result && !quizQuestions && (
          <AdaptiveQuizCard
            quizType={quizType}
            difficulty={quizDifficulty}
            onDifficultyChange={setQuizDifficulty}
            onGenerate={handleGenerateQuiz}
            isGenerating={isGeneratingQuiz}
          />
        )}

        {quizError && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
          >
            {quizError}
          </div>
        )}

        {quizQuestions && (
          <div ref={quizRef}>
            <StudyQuiz
              questions={quizQuestions}
              answers={quizAnswers}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleSubmitAnswers}
              onRegenerate={handleRegenerateQuiz}
              isGenerating={isGeneratingQuiz}
              isGrading={isGradingQuiz}
              validationError={quizValidationError}
              gradeResults={gradeResults}
              correctCount={correctCount}
            />
          </div>
        )}
      </div>
    </main>
  )
}

export default App
