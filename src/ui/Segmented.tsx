interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  label: string
}

/** Control segmentado (pestañas internas de una pantalla). */
export function Segmented<T extends string>({ value, onChange, options, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-[3px] rounded-xl bg-soft p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-[10px] px-1 text-sm font-semibold ${value === o.value ? 'bg-card shadow-sm' : 'text-mut'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
