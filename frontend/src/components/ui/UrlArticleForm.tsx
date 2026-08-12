type UrlArticleFormProps = {
  url: string
  sectionFilter: string
  onUrlChange: (value: string) => void
  onSectionFilterChange: (value: string) => void
  onSectionFilterBlur: () => void
  disabled?: boolean
  isExtracting?: boolean
  extractionError?: string | null
  isExtracted?: boolean
}

const inputBaseClass =
  'w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2'

const UrlArticleForm = ({
  url,
  sectionFilter,
  onUrlChange,
  onSectionFilterChange,
  onSectionFilterBlur,
  disabled = false,
  isExtracting = false,
  extractionError = null,
  isExtracted = false,
}: UrlArticleFormProps) => {
  const canEnterSectionFilter = url.trim().length > 0
  const isSectionFilterDisabled = disabled || isExtracting || !canEnterSectionFilter

  return (
    <div className="relative flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Article or Web Link URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="e.g., https://example.com or blog-post"
          disabled={disabled || isExtracting}
          aria-label="Article or Web Link URL"
          className={`${inputBaseClass} bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700" htmlFor="target-chapter-section-name">
          Target Chapter or Section Name
        </label>
        <input
          id="target-chapter-section-name"
          type="text"
          value={sectionFilter}
          onChange={(e) => onSectionFilterChange(e.target.value)}
          onBlur={onSectionFilterBlur}
          placeholder="e.g., Chapter 3, Part 1 Section 2, Chapters 1-5, or Entire Article etc."
          disabled={isSectionFilterDisabled}
          aria-disabled={isSectionFilterDisabled}
          aria-label="Target Chapter or Section Name"
          className={`${inputBaseClass} ${
            isSectionFilterDisabled
              ? 'cursor-not-allowed bg-gray-100 text-gray-400 placeholder:text-gray-300'
              : 'bg-white text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20'
          }`}
        />
        {!canEnterSectionFilter && (
          <p className="text-xs text-gray-500">Enter the article or web link URL first.</p>
        )}
      </div>

      {isExtracting && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/85 px-4">
          <p className="text-sm font-medium text-indigo-700">
            Scraping and filtering article section in background...
          </p>
        </div>
      )}

      {!isExtracting && isExtracted && !extractionError && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          Article section ready — ready to compare
        </div>
      )}

      {extractionError && !isExtracting && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{extractionError}</div>
      )}
    </div>
  )
}

export default UrlArticleForm
