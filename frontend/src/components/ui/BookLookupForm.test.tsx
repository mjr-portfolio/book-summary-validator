import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BookLookupForm from './BookLookupForm'

describe('BookLookupForm', () => {
  const defaultProps = {
    bookTitle: '',
    author: '',
    chapterSectionName: '',
    onBookTitleChange: vi.fn(),
    onAuthorChange: vi.fn(),
    onChapterSectionNameChange: vi.fn(),
    onChapterSectionNameBlur: vi.fn(),
  }

  it('renders book title, author, and chapter or section name fields', () => {
    render(<BookLookupForm {...defaultProps} />)

    expect(screen.getByRole('textbox', { name: /^book title$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^author$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^chapter or section name$/i })).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/e.g., chapter 3, or part 1 section 2/i),
    ).toBeInTheDocument()
  })

  it('disables chapter or section name until title and author are filled', () => {
    render(<BookLookupForm {...defaultProps} />)

    const sectionInput = screen.getByRole('textbox', { name: /^chapter or section name$/i })
    expect(sectionInput).toBeDisabled()
    expect(sectionInput.className).toContain('cursor-not-allowed')
    expect(screen.getByText(/enter the book title and author first/i)).toBeInTheDocument()
  })

  it('enables chapter or section name when title and author are filled', () => {
    render(
      <BookLookupForm
        {...defaultProps}
        bookTitle="Pride and Prejudice"
        author="Jane Austen"
      />,
    )

    const sectionInput = screen.getByRole('textbox', { name: /^chapter or section name$/i })
    expect(sectionInput).toBeEnabled()
    expect(sectionInput.className).not.toContain('cursor-not-allowed')
    expect(screen.queryByText(/enter the book title and author first/i)).not.toBeInTheDocument()
  })

  it('calls blur handler when chapter or section name loses focus', () => {
    const onChapterSectionNameBlur = vi.fn()

    render(
      <BookLookupForm
        {...defaultProps}
        bookTitle="Pride and Prejudice"
        author="Jane Austen"
        chapterSectionName="Chapter 3"
        onChapterSectionNameBlur={onChapterSectionNameBlur}
      />,
    )

    fireEvent.blur(screen.getByRole('textbox', { name: /^chapter or section name$/i }))

    expect(onChapterSectionNameBlur).toHaveBeenCalled()
  })

  it('shows extracting overlay and success banner', () => {
    const { rerender } = render(
      <BookLookupForm
        {...defaultProps}
        bookTitle="Pride and Prejudice"
        author="Jane Austen"
        isExtracting
      />,
    )

    expect(screen.getByText(/fetching chapter summary in background/i)).toBeInTheDocument()

    rerender(
      <BookLookupForm
        {...defaultProps}
        bookTitle="Pride and Prejudice"
        author="Jane Austen"
        isExtracted
      />,
    )

    expect(screen.getByText(/chapter summary ready — ready to compare/i)).toBeInTheDocument()
  })

  it('shows extraction error banner', () => {
    render(
      <BookLookupForm
        {...defaultProps}
        bookTitle="Pride and Prejudice"
        author="Jane Austen"
        extractionError="Lookup failed."
      />,
    )

    expect(screen.getByText(/lookup failed/i)).toBeInTheDocument()
  })

  it('calls onBookTitleChange when typing', async () => {
    const onBookTitleChange = vi.fn()
    render(<BookLookupForm {...defaultProps} onBookTitleChange={onBookTitleChange} />)

    await userEvent.type(screen.getByRole('textbox', { name: /^book title$/i }), '1984')

    expect(onBookTitleChange).toHaveBeenCalled()
  })
})
