type BookLookupFormProps = {
  bookTitle: string
  author: string
  chapterSectionName: string
  onBookTitleChange: (value: string) => void
  onAuthorChange: (value: string) => void
  onChapterSectionNameChange: (value: string) => void
  onChapterSectionNameBlur: () => void
  disabled?: boolean
  isExtracting?: boolean
  extractionError?: string | null
  isExtracted?: boolean
}

const inputBaseClass =
  'w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2'

const BookLookupForm = ({
  bookTitle,
  author,
  chapterSectionName,
  onBookTitleChange,
  onAuthorChange,
  onChapterSectionNameChange,
  onChapterSectionNameBlur,
  disabled = false,
  isExtracting = false,
  extractionError = null,
  isExtracted = false,
}: BookLookupFormProps) => {
  const canEnterChapterSection =
    bookTitle.trim().length > 0 && author.trim().length > 0

  const isChapterSectionDisabled = disabled || isExtracting || !canEnterChapterSection

  return (
    <div className="relative flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Book Title</span>
        <input
          type="text"
          value={bookTitle}
          onChange={(e) => onBookTitleChange(e.target.value)}
          placeholder="e.g., Pride and Prejudice"
          disabled={disabled || isExtracting}
          aria-label="Book Title"
          className={`${inputBaseClass} bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Author</span>
        <input
          type="text"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          placeholder="e.g., Jane Austen"
          disabled={disabled || isExtracting}
          aria-label="Author"
          className={`${inputBaseClass} bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700" htmlFor="chapter-section-name">
          Chapter or Section Name
        </label>
        <input
          id="chapter-section-name"
          type="text"
          value={chapterSectionName}
          onChange={(e) => onChapterSectionNameChange(e.target.value)}
          onBlur={onChapterSectionNameBlur}
          placeholder="e.g., Chapter 3, Part 1 Section 2, Chapters 1-5, or Entire Book etc."
          disabled={isChapterSectionDisabled}
          aria-disabled={isChapterSectionDisabled}
          aria-label="Chapter or Section Name"
          className={`${inputBaseClass} ${
            isChapterSectionDisabled
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 placeholder:text-gray-300'
              : 'bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20'
          }`}
        />
        {!canEnterChapterSection && (
          <p className="text-xs text-gray-500">Enter the book title and author first.</p>
        )}
      </div>

      {isExtracting && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/85 px-4">
          <p className="text-sm font-medium text-indigo-700">
            Fetching chapter summary in background...
          </p>
        </div>
      )}

      {!isExtracting && isExtracted && !extractionError && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          Chapter summary ready — ready to compare
        </div>
      )}

      {extractionError && !isExtracting && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{extractionError}</div>
      )}
    </div>
  )
}

export default BookLookupForm
