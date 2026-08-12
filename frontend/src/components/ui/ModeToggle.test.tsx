import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModeToggle from './ModeToggle'

describe('ModeToggle', () => {
  it('renders all four input mode tabs', () => {
    render(<ModeToggle mode="text" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /paste text block/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /upload book photo/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tab', { name: /book lookup/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tab', { name: /article url/i })).toHaveAttribute(
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

  it('calls onChange with lookup when book lookup tab is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ModeToggle mode="text" onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))

    expect(onChange).toHaveBeenCalledWith('lookup')
  })

  it('reflects the active lookup mode', () => {
    render(<ModeToggle mode="lookup" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /book lookup/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('calls onChange with url when article url tab is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ModeToggle mode="text" onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))

    expect(onChange).toHaveBeenCalledWith('url')
  })

  it('reflects the active url mode', () => {
    render(<ModeToggle mode="url" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /article url/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
