interface Props<T extends string> {
  value: T
  onChange: (v: T) => void
  options: readonly { value: T; label: string }[]
  label: string
}

/** Control segmentado (pestañas internas de una pantalla). */
export function Segmented<T extends string>({ value, onChange, options, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="cut-sm grid auto-cols-fr grid-flow-col gap-[3px] bg-soft p-[3px] shadow-[inset_0_0_0_1px_var(--line)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 px-0.5 font-num font-bold uppercase ${options.length > 4 ? 'text-[12px] tracking-[0.01em]' : 'text-[15px] tracking-[0.08em]'} ${value === o.value ? 'bg-acc text-accink' : 'text-mut'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
