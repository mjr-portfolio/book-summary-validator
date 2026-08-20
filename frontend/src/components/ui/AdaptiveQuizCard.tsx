import type { QuizDifficulty } from '../../types/compare'

type AdaptiveQuizCardProps = {
  quizType: 'remedial' | 'mastery'
  difficulty: QuizDifficulty
  onDifficultyChange: (difficulty: QuizDifficulty) => void
  onGenerate: () => void
  isGenerating: boolean
  disabled?: boolean
}

const difficulties: { id: QuizDifficulty; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'professional', label: 'Professional' },
]

const AdaptiveQuizCard = ({
  quizType,
  difficulty,
  onDifficultyChange,
  onGenerate,
  isGenerating,
  disabled = false,
}: AdaptiveQuizCardProps) => {
  const isRemedial = quizType === 'remedial'

  return (
    <section
      aria-live="polite"
      className="mt-6 rounded-lg border border-indigo-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {isRemedial
          ? "Review Mode: Let's fix your weak points."
          : 'Mastery Mode: Challenge Your Understanding!'}
      </h2>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!isRemedial && (
          <div
            role="group"
            aria-label="Quiz difficulty"
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
          >
            {difficulties.map(({ id, label }) => {
              const isActive = difficulty === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  disabled={isGenerating || disabled}
                  onClick={() => onDifficultyChange(id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || disabled}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isGenerating
            ? 'AI is formulating your study quiz...'
            : isRemedial
              ? 'Generate 3 Study Questions'
              : 'Launch Challenge Quiz'}
        </button>
      </div>
    </section>
  )
}

export default AdaptiveQuizCard
