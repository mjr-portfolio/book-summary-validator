import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImageUpload from './ImageUpload'

describe('ImageUpload', () => {
  it('renders drop zone instructions when no file is selected', () => {
    render(<ImageUpload file={null} onFileChange={vi.fn()} />)

    expect(screen.getByLabelText(/upload book photo/i)).toBeInTheDocument()
    expect(screen.getByText(/drag and drop a book photo here/i)).toBeInTheDocument()
  })

  it('accepts a valid image from file input', async () => {
    const onFileChange = vi.fn()
    render(<ImageUpload file={null} onFileChange={onFileChange} />)

    const file = new File(['image'], 'page.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await userEvent.upload(input, file)

    expect(onFileChange).toHaveBeenCalledWith(file)
  })

  it('ignores unsupported file types', async () => {
    const onFileChange = vi.fn()
    render(<ImageUpload file={null} onFileChange={onFileChange} />)

    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await userEvent.upload(input, file)

    expect(onFileChange).not.toHaveBeenCalled()
  })

  it('handles drag and drop uploads', () => {
    const onFileChange = vi.fn()
    render(<ImageUpload file={null} onFileChange={onFileChange} />)

    const dropZone = screen.getByLabelText(/upload book photo/i)
    const file = new File(['image'], 'page.jpg', { type: 'image/jpeg' })

    fireEvent.dragOver(dropZone)
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    })

    expect(onFileChange).toHaveBeenCalledWith(file)
  })

  it('does not accept drops while disabled', () => {
    const onFileChange = vi.fn()
    render(<ImageUpload file={null} onFileChange={onFileChange} disabled />)

    const dropZone = screen.getByLabelText(/upload book photo/i)
    const file = new File(['image'], 'page.jpg', { type: 'image/jpeg' })

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    })

    expect(onFileChange).not.toHaveBeenCalled()
  })

  it('opens file picker on Enter key', () => {
    render(<ImageUpload file={null} onFileChange={vi.fn()} />)

    const dropZone = screen.getByLabelText(/upload book photo/i)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    fireEvent.keyDown(dropZone, { key: 'Enter' })

    expect(clickSpy).toHaveBeenCalled()
  })

  it('shows scanning overlay while extracting', () => {
    render(<ImageUpload file={null} onFileChange={vi.fn()} isExtracting />)

    expect(screen.getByText(/scanning text from image in background/i)).toBeInTheDocument()
  })

  it('clears selection when file input is emptied', async () => {
    const onFileChange = vi.fn()
    render(<ImageUpload file={null} onFileChange={onFileChange} />)

    const file = new File(['image'], 'page.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await userEvent.upload(input, file)
    await userEvent.upload(input, [])

    expect(onFileChange).toHaveBeenLastCalledWith(null)
  })

  it('highlights drop zone while dragging', () => {
    render(<ImageUpload file={null} onFileChange={vi.fn()} />)

    const dropZone = screen.getByLabelText(/upload book photo/i)

    fireEvent.dragOver(dropZone)
    expect(dropZone.className).toContain('border-indigo-500')

    fireEvent.dragLeave(dropZone)
    expect(dropZone.className).not.toContain('border-indigo-500')
  })

  it('shows success and error banners', () => {
    const { rerender } = render(
      <ImageUpload file={null} onFileChange={vi.fn()} isExtracted />,
    )

    expect(screen.getByText(/text scanned — ready to compare/i)).toBeInTheDocument()

    rerender(
      <ImageUpload
        file={null}
        onFileChange={vi.fn()}
        extractionError="Could not scan image."
      />,
    )

    expect(screen.getByText(/could not scan image/i)).toBeInTheDocument()
  })
})
