import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudyQuiz from './StudyQuiz'

const questions = [
  { question: 'What is the theme?' },
  { question: 'Who is the hero?' },
  { question: 'What is the conflict?' },
]

describe('StudyQuiz', () => {
  it('renders questions and answer inputs', () => {
    render(
      <StudyQuiz
        questions={questions}
        answers={['', '', '']}
        onAnswerChange={vi.fn()}
        onSubmit={vi.fn()}
        onRegenerate={vi.fn()}
        isGenerating={false}
        isGrading={false}
        validationError={null}
        gradeResults={null}
        correctCount={null}
      />,
    )

    expect(screen.getByText(/what is the theme/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/answer for question 1/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit answers/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /regenerate fresh questions/i })).toBeInTheDocument()
  })

  it('calls handlers for answer changes and submit', async () => {
    const onAnswerChange = vi.fn()
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <StudyQuiz
        questions={questions}
        answers={['', '', '']}
        onAnswerChange={onAnswerChange}
        onSubmit={onSubmit}
        onRegenerate={vi.fn()}
        isGenerating={false}
        isGrading={false}
        validationError={null}
        gradeResults={null}
        correctCount={null}
      />,
    )

    await user.type(screen.getByLabelText(/answer for question 1/i), 'Theme answer')
    expect(onAnswerChange).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /submit answers/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('shows grade feedback and score', () => {
    render(
      <StudyQuiz
        questions={questions}
        answers={['A1', 'A2', 'A3']}
        onAnswerChange={vi.fn()}
        onSubmit={vi.fn()}
        onRegenerate={vi.fn()}
        isGenerating={false}
        isGrading={false}
        validationError={null}
        gradeResults={[
          { is_correct: true, feedback: 'Nice work', hint: 'Keep it up' },
          { is_correct: false, feedback: 'Incomplete', hint: 'Reread the climax' },
          { is_correct: true, feedback: 'Solid', hint: 'Good recall' },
        ]}
        correctCount={2}
      />,
    )

    expect(screen.getByText(/score: 2 \/ 3 correct/i)).toBeInTheDocument()
    expect(screen.getByText(/nice work/i)).toBeInTheDocument()
    expect(screen.getByText(/reread the climax/i)).toBeInTheDocument()
  })
})
