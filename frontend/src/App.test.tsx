import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { compareTexts, extractTextFromImage, generateQuestions, gradeAnswers, lookupBookText, scrapeUrl } from './lib/api'
import { compressImage } from './lib/compressImage'

vi.mock('./lib/compressImage', () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' })),
}))

vi.mock('./lib/api', () => ({
  compareTexts: vi.fn().mockResolvedValue({
    match_percentage: 90,
    critique: 'Strong match.',
  }),
  extractTextFromImage: vi.fn().mockResolvedValue('Extracted book text from image.'),
  lookupBookText: vi.fn().mockResolvedValue('Chapter summary from book lookup.'),
  scrapeUrl: vi.fn().mockResolvedValue('Scraped article text from URL.'),
  generateQuestions: vi.fn().mockResolvedValue({
    questions: [
      { question: 'What is the main theme?' },
      { question: 'Who is the protagonist?' },
      { question: 'What drives the conflict?' },
    ],
  }),
  gradeAnswers: vi.fn().mockResolvedValue({
    correct_count: 2,
    results: [
      { is_correct: true, feedback: 'Accurate.', hint: 'Keep reviewing themes.' },
      { is_correct: false, feedback: 'Incomplete.', hint: 'Revisit character roles.' },
      { is_correct: true, feedback: 'Solid.', hint: 'Consider secondary conflicts too.' },
    ],
  }),
}))

const mockedCompareTexts = vi.mocked(compareTexts)
const mockedExtractTextFromImage = vi.mocked(extractTextFromImage)
const mockedLookupBookText = vi.mocked(lookupBookText)
const mockedScrapeUrl = vi.mocked(scrapeUrl)
const mockedGenerateQuestions = vi.mocked(generateQuestions)
const mockedGradeAnswers = vi.mocked(gradeAnswers)
const mockedCompressImage = vi.mocked(compressImage)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dashboard heading and text mode controls by default', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /book summary validator/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /paste text block/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/book source text/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/user summary/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compare/i })).toBeDisabled()
  })

  it('enables compare in text mode when both textareas have content', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')

    expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
  })

  it('switches to image mode and hides the book textarea', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    expect(screen.queryByLabelText(/book source text/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/upload book photo/i)).toBeInTheDocument()
  })

  it('runs compare in text mode and shows results', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    expect(mockedCompareTexts).toHaveBeenCalledWith('Book excerpt', 'My summary')

    await waitFor(() => {
      expect(screen.getByText('90.0%')).toBeInTheDocument()
      expect(screen.getByText('Strong match.')).toBeInTheDocument()
    })
  })

  it('shows compare errors from the API', async () => {
    mockedCompareTexts.mockRejectedValueOnce(new Error('Rate limit exceeded'))

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Rate limit exceeded')
    })
  })

  it('extracts text after uploading an image and enables compare', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    const file = new File(['image'], 'page.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')

    await waitFor(() => {
      expect(mockedCompressImage).toHaveBeenCalledWith(file)
      expect(mockedExtractTextFromImage).toHaveBeenCalled()
      expect(screen.getByText(/text scanned — ready to compare/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
  })

  it('shows extraction errors when background scan fails', async () => {
    mockedExtractTextFromImage.mockRejectedValueOnce(new Error('Invalid image file'))

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    const file = new File(['image'], 'page.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/invalid image file/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /compare/i })).toBeDisabled()
  })

  it('clears extraction state when image is removed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    const file = new File(['image'], 'page.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/text scanned — ready to compare/i)).toBeInTheDocument()
    })

    await user.upload(input, [])

    expect(screen.queryByText(/text scanned — ready to compare/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compare/i })).toBeDisabled()
  })

  it('ignores stale extraction results after a newer upload starts', async () => {
    let resolveFirst: (value: string) => void
    mockedExtractTextFromImage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce('Second extraction result.')

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const firstFile = new File(['one'], 'first.png', { type: 'image/png' })
    const secondFile = new File(['two'], 'second.png', { type: 'image/png' })

    await user.upload(input, firstFile)
    await user.upload(input, secondFile)

    await waitFor(() => {
      expect(screen.getByText(/text scanned — ready to compare/i)).toBeInTheDocument()
    })

    resolveFirst!('Stale extraction result.')

    await waitFor(() => {
      expect(screen.queryByText(/stale extraction result/i)).not.toBeInTheDocument()
    })
  })

  it('ignores stale extraction errors after a newer upload starts', async () => {
    let rejectFirst: (reason: Error) => void
    mockedExtractTextFromImage
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject
          }),
      )
      .mockResolvedValueOnce('Second extraction result.')

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /upload book photo/i }))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const firstFile = new File(['one'], 'first.png', { type: 'image/png' })
    const secondFile = new File(['two'], 'second.png', { type: 'image/png' })

    await user.upload(input, firstFile)
    await user.upload(input, secondFile)

    await waitFor(() => {
      expect(screen.getByText(/text scanned — ready to compare/i)).toBeInTheDocument()
    })

    rejectFirst!(new Error('Stale extraction failure'))

    await waitFor(() => {
      expect(screen.queryByText(/stale extraction failure/i)).not.toBeInTheDocument()
    })
  })

  it('shows loading label while compare is in flight', async () => {
    let resolveCompare: (value: { match_percentage: number; critique: string }) => void
    mockedCompareTexts.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCompare = resolve
        }),
    )

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    expect(screen.getByRole('button', { name: /ai evaluating summary/i })).toBeDisabled()

    resolveCompare!({ match_percentage: 88, critique: 'Good summary.' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
    })
  })

  it('switches to book lookup mode and shows lookup form', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))

    expect(screen.getByLabelText(/book title/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^author$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^chapter or section name$/i })).toBeDisabled()
  })

  it('locks chapter or section name until title and author are filled', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))

    const sectionInput = screen.getByRole('textbox', { name: /^chapter or section name$/i })
    expect(sectionInput).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: /^book title$/i }), 'Pride and Prejudice')
    expect(sectionInput).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: /^author$/i }), 'Jane Austen')
    expect(sectionInput).toBeEnabled()
  })

  it('clears chapter section name when author is cleared', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))
    await user.type(screen.getByRole('textbox', { name: /^book title$/i }), 'Pride and Prejudice')
    await user.type(screen.getByRole('textbox', { name: /^author$/i }), 'Jane Austen')
    await user.type(screen.getByRole('textbox', { name: /^chapter or section name$/i }), 'Chapter 3')

    expect(screen.getByRole('textbox', { name: /^chapter or section name$/i })).toHaveValue('Chapter 3')

    await user.clear(screen.getByRole('textbox', { name: /^author$/i }))

    expect(screen.getByRole('textbox', { name: /^chapter or section name$/i })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: /^chapter or section name$/i })).toBeDisabled()
  })

  it('fetches chapter summary on blur and enables compare', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))
    await user.type(screen.getByRole('textbox', { name: /^book title$/i }), 'Pride and Prejudice')
    await user.type(screen.getByRole('textbox', { name: /^author$/i }), 'Jane Austen')
    await user.type(screen.getByRole('textbox', { name: /^chapter or section name$/i }), 'Chapter 3')
    await user.tab()
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')

    await waitFor(() => {
      expect(mockedLookupBookText).toHaveBeenCalledWith(
        'Pride and Prejudice',
        'Jane Austen',
        'Chapter 3',
      )
      expect(screen.getByText(/chapter summary ready — ready to compare/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
  })

  it('runs compare using lookup summary as source text', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))
    await user.type(screen.getByRole('textbox', { name: /^book title$/i }), 'Pride and Prejudice')
    await user.type(screen.getByRole('textbox', { name: /^author$/i }), 'Jane Austen')
    await user.type(screen.getByRole('textbox', { name: /^chapter or section name$/i }), 'Chapter 3')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/chapter summary ready — ready to compare/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    expect(mockedCompareTexts).toHaveBeenCalledWith(
      'Chapter summary from book lookup.',
      'My summary',
    )
  })

  it('clears lookup extraction when switching tabs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /book lookup/i }))
    await user.type(screen.getByRole('textbox', { name: /^book title$/i }), 'Pride and Prejudice')
    await user.type(screen.getByRole('textbox', { name: /^author$/i }), 'Jane Austen')
    await user.type(screen.getByRole('textbox', { name: /^chapter or section name$/i }), 'Chapter 3')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/chapter summary ready — ready to compare/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /paste text block/i }))

    expect(screen.queryByText(/chapter summary ready — ready to compare/i)).not.toBeInTheDocument()
  })

  it('switches to article url mode and shows url form', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))

    expect(screen.getByLabelText(/article or web link url/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/target chapter or section name/i)).toBeDisabled()
    expect(screen.queryByLabelText(/book source text/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/book title/i)).not.toBeInTheDocument()
  })

  it('locks target section until url is filled', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))

    const sectionInput = screen.getByLabelText(/target chapter or section name/i)
    expect(sectionInput).toBeDisabled()

    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/article',
    )
    expect(sectionInput).toBeEnabled()
  })

  it('does not scrape when leaving the url field', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))
    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/article',
    )
    await user.tab()

    expect(mockedScrapeUrl).not.toHaveBeenCalled()
  })

  it('scrapes article section on section blur and enables compare', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))
    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/article',
    )
    await user.type(screen.getByLabelText(/target chapter or section name/i), 'Introduction')
    await user.tab()
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')

    await waitFor(() => {
      expect(mockedScrapeUrl).toHaveBeenCalledWith(
        'https://example.com/article',
        'Introduction',
      )
      expect(screen.getByText(/article section ready — ready to compare/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
  })

  it('runs compare using scraped article section as source', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))
    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/article',
    )
    await user.type(screen.getByLabelText(/target chapter or section name/i), 'Introduction')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/article section ready — ready to compare/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    expect(mockedCompareTexts).toHaveBeenCalledWith(
      'Scraped article text from URL.',
      'My summary',
    )
  })

  it('shows scrape errors from the API', async () => {
    mockedScrapeUrl.mockRejectedValueOnce(new Error('Could not reach URL or page is unreachable'))

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))
    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/missing',
    )
    await user.type(screen.getByLabelText(/target chapter or section name/i), 'Introduction')
    await user.tab()

    await waitFor(() => {
      expect(
        screen.getByText(/could not reach url or page is unreachable/i),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /compare/i })).toBeDisabled()
  })

  it('clears url extraction when switching tabs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))
    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/article',
    )
    await user.type(screen.getByLabelText(/target chapter or section name/i), 'Introduction')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/article section ready — ready to compare/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /paste text block/i }))

    expect(screen.queryByText(/article section ready — ready to compare/i)).not.toBeInTheDocument()
  })

  it('clears target section when url is cleared', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: /article url/i }))
    await user.type(
      screen.getByLabelText(/article or web link url/i),
      'https://example.com/article',
    )
    await user.type(screen.getByLabelText(/target chapter or section name/i), 'Introduction')

    expect(screen.getByLabelText(/target chapter or section name/i)).toHaveValue('Introduction')

    await user.clear(screen.getByLabelText(/article or web link url/i))

    expect(screen.getByLabelText(/target chapter or section name/i)).toHaveValue('')
    expect(screen.getByLabelText(/target chapter or section name/i)).toBeDisabled()
  })

  it('does not add a quiz navigation tab', () => {
    render(<App />)

    expect(screen.queryByRole('tab', { name: /quiz/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
  })

  it('shows mastery quiz card when match is at least 70', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /mastery mode: challenge your understanding/i }),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /launch challenge quiz/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /quiz difficulty/i })).toBeInTheDocument()
  })

  it('shows remedial quiz card when match is under 70', async () => {
    mockedCompareTexts.mockResolvedValueOnce({
      match_percentage: 55,
      critique: 'Missed key themes.',
    })

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /review mode: let's fix your weak points/i }),
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /generate 3 study questions/i })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /quiz difficulty/i })).not.toBeInTheDocument()
  })

  it('generates and renders study questions', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /launch challenge quiz/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /launch challenge quiz/i }))

    await waitFor(() => {
      expect(mockedGenerateQuestions).toHaveBeenCalledWith({
        source_text: 'Book excerpt',
        critique: 'Strong match.',
        quiz_type: 'mastery',
        difficulty: 'standard',
        exclusion_history: [],
      })
      expect(screen.getByText(/what is the main theme/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /launch challenge quiz/i })).not.toBeInTheDocument()
  })

  it('validates empty answers before grading', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /launch challenge quiz/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /launch challenge quiz/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit answers/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /submit answers/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      /please answer all three questions before submitting/i,
    )
    expect(mockedGradeAnswers).not.toHaveBeenCalled()
  })

  it('submits answers and shows grade results', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /launch challenge quiz/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /launch challenge quiz/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/answer for question 1/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/answer for question 1/i), 'Theme answer')
    await user.type(screen.getByLabelText(/answer for question 2/i), 'Hero answer')
    await user.type(screen.getByLabelText(/answer for question 3/i), 'Conflict answer')
    await user.click(screen.getByRole('button', { name: /submit answers/i }))

    await waitFor(() => {
      expect(mockedGradeAnswers).toHaveBeenCalledWith({
        source_text: 'Book excerpt',
        questions: [
          'What is the main theme?',
          'Who is the protagonist?',
          'What drives the conflict?',
        ],
        answers: ['Theme answer', 'Hero answer', 'Conflict answer'],
      })
      expect(screen.getByText(/score: 2 \/ 3 correct/i)).toBeInTheDocument()
      expect(screen.getByText(/revisit character roles/i)).toBeInTheDocument()
    })
  })

  it('regenerates questions with exclusion history and truncates past 10', async () => {
    mockedGenerateQuestions
      .mockResolvedValueOnce({
        questions: [
          { question: 'First Q1?' },
          { question: 'First Q2?' },
          { question: 'First Q3?' },
        ],
      })
      .mockResolvedValueOnce({
        questions: [
          { question: 'Second Q1?' },
          { question: 'Second Q2?' },
          { question: 'Second Q3?' },
        ],
      })
      .mockResolvedValueOnce({
        questions: [
          { question: 'Third Q1?' },
          { question: 'Third Q2?' },
          { question: 'Third Q3?' },
        ],
      })
      .mockResolvedValueOnce({
        questions: [
          { question: 'Fourth Q1?' },
          { question: 'Fourth Q2?' },
          { question: 'Fourth Q3?' },
        ],
      })

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/book source text/i), 'Book excerpt')
    await user.type(screen.getByLabelText(/user summary/i), 'My summary')
    await user.click(screen.getByRole('button', { name: /compare/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /launch challenge quiz/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /launch challenge quiz/i }))

    await waitFor(() => {
      expect(screen.getByText(/first q1/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /regenerate fresh questions/i }))
    await waitFor(() => {
      expect(screen.getByText(/second q1/i)).toBeInTheDocument()
    })
    expect(mockedGenerateQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exclusion_history: ['First Q1?', 'First Q2?', 'First Q3?'],
      }),
    )

    await user.click(screen.getByRole('button', { name: /regenerate fresh questions/i }))
    await waitFor(() => {
      expect(screen.getByText(/third q1/i)).toBeInTheDocument()
    })
    expect(mockedGenerateQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exclusion_history: [
          'First Q1?',
          'First Q2?',
          'First Q3?',
          'Second Q1?',
          'Second Q2?',
          'Second Q3?',
        ],
      }),
    )

    await user.click(screen.getByRole('button', { name: /regenerate fresh questions/i }))
    await waitFor(() => {
      expect(screen.getByText(/fourth q1/i)).toBeInTheDocument()
    })
    expect(mockedGenerateQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exclusion_history: [
          'First Q1?',
          'First Q2?',
          'First Q3?',
          'Second Q1?',
          'Second Q2?',
          'Second Q3?',
          'Third Q1?',
          'Third Q2?',
          'Third Q3?',
        ],
      }),
    )

    // Seed history beyond 10 by regenerating enough times is heavy; assert truncation helper path
    // by mocking a long prior history through successive regenerations until length exceeds 10.
    mockedGenerateQuestions.mockResolvedValue({
      questions: [
        { question: 'Extra Q1?' },
        { question: 'Extra Q2?' },
        { question: 'Extra Q3?' },
      ],
    })

    // Current history has 9 items; one more regenerate appends 3 -> 12, then truncates to last 10.
    await user.click(screen.getByRole('button', { name: /regenerate fresh questions/i }))
    await waitFor(() => {
      expect(mockedGenerateQuestions.mock.calls.at(-1)?.[0].exclusion_history).toHaveLength(10)
    })
    expect(mockedGenerateQuestions.mock.calls.at(-1)?.[0].exclusion_history).toEqual([
      'First Q3?',
      'Second Q1?',
      'Second Q2?',
      'Second Q3?',
      'Third Q1?',
      'Third Q2?',
      'Third Q3?',
      'Fourth Q1?',
      'Fourth Q2?',
      'Fourth Q3?',
    ])
  })
})
