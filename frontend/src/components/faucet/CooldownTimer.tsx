'use client'

import { useEffect, useState } from 'react'

interface CooldownTimerProps {
  secondsRemaining: number
}

export function CooldownTimer({ secondsRemaining }: CooldownTimerProps) {
  const [seconds, setSeconds] = useState(secondsRemaining)

  useEffect(() => {
    setSeconds(secondsRemaining)
  }, [secondsRemaining])

  useEffect(() => {
    if (seconds <= 0) return
    const interval = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [seconds])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#444]">Available in</span>
      <span className="font-mono text-sm font-black text-white tabular-nums shadow-[0_0_10px_rgba(255,255,255,0.05)]">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>
    </div>
  )
}
