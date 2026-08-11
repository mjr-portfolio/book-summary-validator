import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { compareTexts, extractTextFromImage } from './lib/api'
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
}))

const mockedCompareTexts = vi.mocked(compareTexts)
const mockedExtractTextFromImage = vi.mocked(extractTextFromImage)
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
})
