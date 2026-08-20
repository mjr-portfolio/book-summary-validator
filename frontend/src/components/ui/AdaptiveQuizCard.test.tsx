import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdaptiveQuizCard from './AdaptiveQuizCard'

describe('AdaptiveQuizCard', () => {
  it('renders remedial mode without difficulty toggle', () => {
    render(
      <AdaptiveQuizCard
        quizType="remedial"
        difficulty="standard"
        onDifficultyChange={vi.fn()}
        onGenerate={vi.fn()}
        isGenerating={false}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /review mode: let's fix your weak points/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate 3 study questions/i })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /quiz difficulty/i })).not.toBeInTheDocument()
  })

  it('renders mastery mode with difficulty toggle', async () => {
    const onDifficultyChange = vi.fn()
    const onGenerate = vi.fn()
    const user = userEvent.setup()

    render(
      <AdaptiveQuizCard
        quizType="mastery"
        difficulty="standard"
        onDifficultyChange={onDifficultyChange}
        onGenerate={onGenerate}
        isGenerating={false}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /mastery mode: challenge your understanding/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /launch challenge quiz/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^advanced$/i }))
    expect(onDifficultyChange).toHaveBeenCalledWith('advanced')

    await user.click(screen.getByRole('button', { name: /launch challenge quiz/i }))
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('shows generating label while loading', () => {
    render(
      <AdaptiveQuizCard
        quizType="remedial"
        difficulty="standard"
        onDifficultyChange={vi.fn()}
        onGenerate={vi.fn()}
        isGenerating
      />,
    )

    expect(
      screen.getByRole('button', { name: /ai is formulating your study quiz/i }),
    ).toBeDisabled()
  })
})
