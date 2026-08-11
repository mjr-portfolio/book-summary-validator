import { useRef, useState, type DragEvent } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type ImageUploadProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
  isExtracting?: boolean
  extractionError?: string | null
  isExtracted?: boolean
}

const ImageUpload = ({
  file,
  onFileChange,
  disabled = false,
  isExtracting = false,
  extractionError = null,
  isExtracted = false,
}: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFile = (selected: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (!selected) {
      setPreviewUrl(null)
      onFileChange(null)
      return
    }

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      return
    }

    setPreviewUrl(URL.createObjectURL(selected))
    onFileChange(selected)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      handleFile(droppedFile)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">Book Photo</span>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload book photo"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!disabled) inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        {file && previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="Book page preview"
              className="max-h-48 max-w-full rounded-md border border-gray-200 object-contain shadow-sm"
            />
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-500">Click or drag to replace</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Drag and drop a book photo here</p>
            <p className="text-xs text-gray-500">or click to browse (JPEG, PNG, WebP)</p>
          </div>
        )}

        {isExtracting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/85 px-4">
            <p className="text-sm font-medium text-indigo-700">
              Scanning text from image in background...
            </p>
          </div>
        )}

        {!isExtracting && isExtracted && !extractionError && (
          <div className="absolute bottom-3 left-3 right-3 rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            Text scanned — ready to compare
          </div>
        )}

        {extractionError && !isExtracting && (
          <div className="absolute bottom-3 left-3 right-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {extractionError}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageUpload
