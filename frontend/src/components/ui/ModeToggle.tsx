type InputMode = 'text' | 'image'

type ModeToggleProps = {
  mode: InputMode
  onChange: (mode: InputMode) => void
}

const modes: { id: InputMode; label: string }[] = [
  { id: 'text', label: 'Paste Text Block' },
  { id: 'image', label: 'Upload Book Photo' },
]

const ModeToggle = ({ mode, onChange }: ModeToggleProps) => {
  return (
    <div
      role="tablist"
      aria-label="Input mode"
      className="mx-auto mb-8 flex w-full max-w-xl rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
    >
      {modes.map(({ id, label }) => {
        const isActive = mode === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default ModeToggle
