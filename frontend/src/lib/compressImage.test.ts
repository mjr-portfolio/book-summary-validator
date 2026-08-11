import { compressImage } from './compressImage'

describe('compressImage', () => {
  it('returns a JPEG blob after scaling large images', async () => {
    const mockBlob = new Blob(['jpeg'], { type: 'image/jpeg' })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback?.(mockBlob)
    })

    class MockImage {
      width = 3000
      height = 1500
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

    const sourceFile = new File(['data'], 'large.png', { type: 'image/png' })
    const compressed = await compressImage(sourceFile, 2048, 0.8)

    expect(compressed).toBe(mockBlob)
    expect(compressed.type).toBe('image/jpeg')
  })

  it('keeps small images at their original dimensions', async () => {
    const mockBlob = new Blob(['jpeg'], { type: 'image/jpeg' })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)

    const toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => {
        callback?.(mockBlob)
      })

    class MockImage {
      width = 800
      height = 600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

    const sourceFile = new File(['data'], 'small.png', { type: 'image/png' })
    await compressImage(sourceFile)

    expect(toBlobSpy).toHaveBeenCalled()
  })

  it('rejects when the image fails to load', async () => {
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onerror?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

    const sourceFile = new File(['data'], 'broken.png', { type: 'image/png' })

    await expect(compressImage(sourceFile)).rejects.toThrow(
      'Failed to load image for compression',
    )
  })

  it('rejects when canvas context is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    class MockImage {
      width = 800
      height = 600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

    const sourceFile = new File(['data'], 'page.png', { type: 'image/png' })

    await expect(compressImage(sourceFile)).rejects.toThrow(
      'Failed to initialize canvas for image compression',
    )
  })

  it('rejects when canvas drawing throws', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(() => {
        throw new Error('draw failed')
      }),
    } as unknown as CanvasRenderingContext2D)

    class MockImage {
      width = 800
      height = 600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

    const sourceFile = new File(['data'], 'page.png', { type: 'image/png' })

    await expect(compressImage(sourceFile)).rejects.toThrow('draw failed')
  })

  it('rejects when compression returns no blob', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback?.(null)
    })

    class MockImage {
      width = 800
      height = 600
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image)

    const sourceFile = new File(['data'], 'page.png', { type: 'image/png' })

    await expect(compressImage(sourceFile)).rejects.toThrow('Failed to compress image')
  })
})
