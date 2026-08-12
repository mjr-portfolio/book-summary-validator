import { compareTexts, extractTextFromImage, lookupBookText, scrapeUrl } from './api'

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

describe('lookupBookText', () => {
  it('sends form data and returns extracted text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ extracted_text: 'Chapter summary text.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupBookText('Pride and Prejudice', 'Jane Austen', 'Chapter 3')

    expect(result).toBe('Chapter summary text.')
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/lookup-text')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)

    const formData = options.body as FormData
    expect(formData.get('book_title')).toBe('Pride and Prejudice')
    expect(formData.get('author')).toBe('Jane Austen')
    expect(formData.get('chapter_or_section_name')).toBe('Chapter 3')

    vi.unstubAllGlobals()
  })

  it('trims payload values before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ extracted_text: 'Summary.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await lookupBookText('  1984  ', '  George Orwell  ', '  Chapter 1  ')

    const formData = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(formData.get('book_title')).toBe('1984')
    expect(formData.get('author')).toBe('George Orwell')
    expect(formData.get('chapter_or_section_name')).toBe('Chapter 1')

    vi.unstubAllGlobals()
  })

  it('throws when lookup fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ detail: 'author must not be empty' }),
      }),
    )

    await expect(lookupBookText('1984', '', 'Chapter 1')).rejects.toThrow(
      'author must not be empty',
    )

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

    await expect(lookupBookText('1984', 'George Orwell', 'Chapter 1')).rejects.toThrow(
      'Book lookup response was missing extracted text',
    )

    vi.unstubAllGlobals()
  })
})

describe('scrapeUrl', () => {
  it('sends form data and returns extracted text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ extracted_text: 'Scraped article paragraph.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await scrapeUrl('https://example.com/post', 'Introduction')

    expect(result).toBe('Scraped article paragraph.')
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/scrape-url')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)

    const formData = options.body as FormData
    expect(formData.get('url')).toBe('https://example.com/post')
    expect(formData.get('section_filter')).toBe('Introduction')

    vi.unstubAllGlobals()
  })

  it('trims the url and section filter before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ extracted_text: 'Article body.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await scrapeUrl('  https://example.com/post  ', '  Introduction  ')

    const formData = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(formData.get('url')).toBe('https://example.com/post')
    expect(formData.get('section_filter')).toBe('Introduction')

    vi.unstubAllGlobals()
  })

  it('throws when scrape fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Could not reach URL or page is unreachable' }),
      }),
    )

    await expect(scrapeUrl('https://example.com/missing', 'Introduction')).rejects.toThrow(
      'Could not reach URL or page is unreachable',
    )

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

    await expect(scrapeUrl('https://example.com/post', 'Introduction')).rejects.toThrow(
      'URL scrape response was missing extracted text',
    )

    vi.unstubAllGlobals()
  })
})
