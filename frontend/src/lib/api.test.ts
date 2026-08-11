import { compareTexts, extractTextFromImage } from './api'

describe('compareTexts', () => {
  it('returns parsed response on success', async () => {
    const mockResponse = { match_percentage: 85, critique: 'Good summary.' }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await compareTexts('Book content', 'My summary')

    expect(result).toEqual(mockResponse)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/compare')
    expect(options.method).toBe('POST')
    expect(options.headers).toBeUndefined()
    expect(options.body).toBeInstanceOf(FormData)

    const formData = options.body as FormData
    expect(formData.get('book_text')).toBe('Book content')
    expect(formData.get('user_summary')).toBe('My summary')

    vi.unstubAllGlobals()
  })

  it('throws when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'Server error' }),
      }),
    )

    await expect(compareTexts('Book content', 'My summary')).rejects.toThrow('Server error')

    vi.unstubAllGlobals()
  })

  it('uses fallback message when error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('invalid json')),
      }),
    )

    await expect(compareTexts('Book content', 'My summary')).rejects.toThrow(
      'Compare request failed with status 502',
    )

    vi.unstubAllGlobals()
  })

  it('throws when response fields are invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ match_percentage: 'bad', critique: '   ' }),
      }),
    )

    await expect(compareTexts('Book content', 'My summary')).rejects.toThrow(
      'Compare response was missing required result fields',
    )

    vi.unstubAllGlobals()
  })

  it('trims payload values before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ match_percentage: 70, critique: 'Okay.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await compareTexts('  Book content  ', '  My summary  ')

    const formData = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(formData.get('book_text')).toBe('Book content')
    expect(formData.get('user_summary')).toBe('My summary')

    vi.unstubAllGlobals()
  })
})

describe('extractTextFromImage', () => {
  it('sends multipart form data and returns extracted text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ extracted_text: 'Scanned paragraph.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })
    const result = await extractTextFromImage(blob)

    expect(result).toBe('Scanned paragraph.')
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/extract-text')
    expect(options.method).toBe('POST')
    expect(options.headers).toBeUndefined()
    expect(options.body).toBeInstanceOf(FormData)

    vi.unstubAllGlobals()
  })

  it('throws when extraction fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ detail: 'image must not be empty' }),
      }),
    )

    const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })

    await expect(extractTextFromImage(blob)).rejects.toThrow('image must not be empty')

    vi.unstubAllGlobals()
  })

  it('throws when extracted text is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ extracted_text: '   ' }),
      }),
    )

    const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })

    await expect(extractTextFromImage(blob)).rejects.toThrow(
      'Text extraction response was missing extracted text',
    )

    vi.unstubAllGlobals()
  })
})
