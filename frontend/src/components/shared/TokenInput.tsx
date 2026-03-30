'use client'

interface TokenInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  symbol: string
  balance?: string
  placeholder?: string
  disabled?: boolean
}

export function TokenInput({
  label,
  value,
  onChange,
  symbol,
  balance,
  placeholder = '0.00',
  disabled = false,
}: TokenInputProps) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] p-4 hover:border-[var(--border-default)] focus-within:border-[var(--accent-muted)] focus-within:shadow-[0_0_12px_var(--accent-glow)] transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
        {balance !== undefined && (
          <button
            type="button"
            onClick={() => onChange(balance)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-150 font-mono"
          >
            Balance: {balance}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent text-xl font-mono tabular-nums outline-none placeholder:text-[var(--text-ghost)] disabled:opacity-30 caret-[var(--accent)]"
        />
        <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0 px-2.5 py-1.5 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)]">
          {symbol}
        </span>
      </div>
    </div>
  )
}
