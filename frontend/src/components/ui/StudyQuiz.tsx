import type { GradeAnswerResult, StudyQuestion } from '../../types/compare'

type StudyQuizProps = {
  questions: StudyQuestion[]
  answers: string[]
  onAnswerChange: (index: number, value: string) => void
  onSubmit: () => void
  onRegenerate: () => void
  isGenerating: boolean
  isGrading: boolean
  validationError: string | null
  gradeResults: GradeAnswerResult[] | null
  correctCount: number | null
}

const StudyQuiz = ({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onRegenerate,
  isGenerating,
  isGrading,
  validationError,
  gradeResults,
  correctCount,
}: StudyQuizProps) => {
  return (
    <section
      aria-live="polite"
      className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Study Quiz</h2>
      <p className="mt-1 text-sm text-gray-500">Answer each question in your own words.</p>

      <ol className="mt-4 space-y-5">
        {questions.map((item, index) => {
          const result = gradeResults?.[index]
          return (
            <li key={`${index}-${item.question}`} className="rounded-lg border border-gray-100 p-4">
              <p className="font-medium text-gray-900">
                <span className="mr-2 text-indigo-600">{index + 1}.</span>
                {item.question}
              </p>
              <label className="mt-3 flex flex-col gap-1">
                <span className="sr-only">Answer for question {index + 1}</span>
                <textarea
                  value={answers[index] ?? ''}
                  onChange={(e) => onAnswerChange(index, e.target.value)}
                  disabled={isGenerating || isGrading}
                  rows={3}
                  placeholder="Type your answer..."
                  className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50"
                />
              </label>
              {result && (
                <div
                  className={`mt-3 rounded-md px-3 py-2 text-sm ${
                    result.is_correct
                      ? 'border border-green-200 bg-green-50 text-green-800'
                      : 'border border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <p className="font-medium">{result.is_correct ? 'Correct' : 'Needs work'}</p>
                  <p className="mt-1">{result.feedback}</p>
                  <p className="mt-1 text-xs opacity-90">
                    <span className="font-semibold">Hint:</span> {result.hint}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {validationError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {validationError}
        </div>
      )}

      {correctCount !== null && (
        <p className="mt-4 text-sm font-medium text-gray-800">
          Score: {correctCount} / 3 correct
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isGenerating || isGrading}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isGrading ? 'AI is scoring your answers...' : 'Submit Answers'}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isGenerating || isGrading}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? 'AI is formulating your study quiz...' : 'Regenerate Fresh Questions'}
        </button>
      </div>
    </section>
  )
}

export default StudyQuiz
