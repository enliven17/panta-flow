export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--violet)] flex items-center justify-center text-[7px] font-black text-[var(--bg-deep)]">
            P
          </div>
          <span className="text-xs font-bold tracking-[0.2em] text-[var(--text-muted)]">PANTA</span>
        </div>
        <span className="text-xs text-[var(--text-ghost)]">Perpetual DEX on Initia EVM Testnet</span>
      </div>
    </footer>
  )
}
