import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModeToggle from './ModeToggle'

describe('ModeToggle', () => {
  it('renders both input mode tabs', () => {
    render(<ModeToggle mode="text" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /paste text block/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /upload book photo/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('calls onChange when switching modes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ModeToggle mode="text" onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    expect(onChange).toHaveBeenCalledWith('image')
  })

  it('reflects the active image mode', () => {
    render(<ModeToggle mode="image" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /upload book photo/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
