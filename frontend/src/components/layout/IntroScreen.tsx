'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const LETTERS = ['P', 'A', 'N', 'T', 'A']
const EASE = [0.16, 1, 0.3, 1] as const

// Timing:
//   0.20s – first letter appears
//   0.68s – last letter appears  (0.2 + 4×0.12)
//   0.40s animation per letter
//   Hold until 1.15s, then exit
//   Exit: letters drop + curtains split (0.70s)
//   Done: 1.90s

const EXIT_AT  = 1150
const DONE_AT  = 1900

interface Props {
  onComplete: () => void
}

export function IntroScreen({ onComplete }: Props) {
  const [isExiting, setIsExiting] = useState(false)
  const [isDone,    setIsDone]    = useState(false)
  const letterY = useRef(0)

  useEffect(() => {
    const t1 = setTimeout(() => {
      letterY.current = typeof window !== 'undefined' ? window.innerHeight * 0.35 : 280
      setIsExiting(true)
    }, EXIT_AT)

    const t2 = setTimeout(() => {
      setIsDone(true)
      onComplete()
    }, DONE_AT)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  if (isDone) return null

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 300 }}>

      {/* ── Top curtain ───────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-x-0 top-0 bg-[#050505]"
        style={{ height: '50vh' }}
        animate={isExiting ? { y: '-100%' } : { y: 0 }}
        transition={{ duration: 0.68, ease: EASE, delay: 0.06 }}
      />

      {/* ── Bottom curtain ────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-[#050505]"
        style={{ height: '50vh' }}
        animate={isExiting ? { y: '100%' } : { y: 0 }}
        transition={{ duration: 0.68, ease: EASE, delay: 0.06 }}
      />

      {/* ── Letters ───────────────────────────────────────────────────────── */}
      {/* Wrapper centers letters; motion.div shifts them down on exit */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
        <motion.div
          className="flex items-center"
          style={{ gap: 'clamp(6px, 1.5vw, 20px)' }}
          animate={{ y: isExiting ? letterY.current : 0 }}
          transition={{ duration: 0.62, ease: EASE }}
        >
          {LETTERS.map((letter, i) => (
            <motion.span
              key={i}
              className="text-[#00C076] font-black leading-none select-none"
              style={{
                fontSize: 'clamp(64px, 13vw, 148px)',
                letterSpacing: '-0.05em',
              }}
              initial={{ opacity: 0, y: 32, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                delay: 0.2 + i * 0.12,
                duration: 0.42,
                ease: EASE,
              }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
