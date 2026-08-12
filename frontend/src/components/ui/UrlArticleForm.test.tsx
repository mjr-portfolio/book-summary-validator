import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlArticleForm from './UrlArticleForm'

describe('UrlArticleForm', () => {
  const defaultProps = {
    url: '',
    sectionFilter: '',
    onUrlChange: vi.fn(),
    onSectionFilterChange: vi.fn(),
    onSectionFilterBlur: vi.fn(),
  }

  it('renders the article URL and target section fields', () => {
    render(<UrlArticleForm {...defaultProps} />)

    expect(screen.getByLabelText(/article or web link url/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/e.g., https:\/\/example.com or blog-post/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/target chapter or section name/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/e.g., chapter 3, part 1 section 2, chapters 1-5, or entire article etc./i),
    ).toBeInTheDocument()
  })

  it('disables target section until url has text', () => {
    render(<UrlArticleForm {...defaultProps} />)

    const sectionInput = screen.getByLabelText(/target chapter or section name/i)
    expect(sectionInput).toBeDisabled()
    expect(sectionInput.className).toContain('cursor-not-allowed')
    expect(screen.getByText(/enter the article or web link url first/i)).toBeInTheDocument()
  })

  it('enables target section when url has text', () => {
    render(<UrlArticleForm {...defaultProps} url="https://example.com/article" />)

    const sectionInput = screen.getByLabelText(/target chapter or section name/i)
    expect(sectionInput).toBeEnabled()
    expect(sectionInput.className).not.toContain('cursor-not-allowed')
    expect(screen.queryByText(/enter the article or web link url first/i)).not.toBeInTheDocument()
  })

  it('calls onUrlChange when typing the url', async () => {
    const onUrlChange = vi.fn()
    const user = userEvent.setup()

    render(<UrlArticleForm {...defaultProps} onUrlChange={onUrlChange} />)

    await user.type(screen.getByLabelText(/article or web link url/i), 'https://example.com')

    expect(onUrlChange).toHaveBeenCalled()
  })

  it('calls onSectionFilterBlur when the section field loses focus', () => {
    const onSectionFilterBlur = vi.fn()

    render(
      <UrlArticleForm
        {...defaultProps}
        url="https://example.com/article"
        sectionFilter="Introduction"
        onSectionFilterBlur={onSectionFilterBlur}
      />,
    )

    fireEvent.blur(screen.getByLabelText(/target chapter or section name/i))

    expect(onSectionFilterBlur).toHaveBeenCalled()
  })

  it('shows extracting overlay and success banner', () => {
    const { rerender } = render(
      <UrlArticleForm {...defaultProps} url="https://example.com/article" isExtracting />,
    )

    expect(
      screen.getByText(/scraping and filtering article section in background/i),
    ).toBeInTheDocument()

    rerender(
      <UrlArticleForm
        {...defaultProps}
        url="https://example.com/article"
        sectionFilter="Introduction"
        isExtracted
      />,
    )

    expect(screen.getByText(/article section ready — ready to compare/i)).toBeInTheDocument()
  })

  it('shows extraction errors', () => {
    render(
      <UrlArticleForm
        {...defaultProps}
        url="https://example.com/article"
        extractionError="Could not scrape article."
      />,
    )

    expect(screen.getByText(/could not scrape article/i)).toBeInTheDocument()
  })
})
