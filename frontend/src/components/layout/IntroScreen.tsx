'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const LETTERS = ['P', 'A', 'N', 'T', 'A']
const EASE = [0.16, 1, 0.3, 1] as const

// Timing
const EXIT_AT = 950   // start exit (letters fade + curtains open)
const DONE_AT = 1950  // fully done

interface Props {
  onComplete: () => void
}

export function IntroScreen({ onComplete }: Props) {
  const [isExiting, setIsExiting] = useState(false)
  const [isDone,    setIsDone]    = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const t1 = setTimeout(() => setIsExiting(true), EXIT_AT)
    const t2 = setTimeout(() => {
      setIsDone(true)
      onCompleteRef.current()
    }, DONE_AT)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (isDone) return null

  return (
    // bg-black fills screen — no gap between curtains
    <div className="fixed inset-0 bg-[#050505]" style={{ zIndex: 300 }}>

      {/* ── Top curtain ─────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-x-0 top-0 bg-[#050505]"
        style={{ height: '50.5vh' }}           // slight overlap, no seam
        animate={isExiting ? { y: '-100%' } : { y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
      />

      {/* ── Bottom curtain ──────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-[#050505]"
        style={{ height: '50.5vh' }}
        animate={isExiting ? { y: '100%' } : { y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
      />

      {/* ── Letters ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
        <motion.div
          className="flex items-center"
          style={{ gap: 'clamp(10px, 2.5vw, 36px)' }}
          animate={isExiting ? { y: 60, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {LETTERS.map((letter, i) => (
            <motion.span
              key={i}
              className="text-[#00C076] font-black leading-none select-none"
              style={{
                fontSize: 'clamp(80px, 18vw, 200px)',
                letterSpacing: '-0.03em',
              }}
              // No blur — too expensive on large text
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + i * 0.1,
                duration: 0.38,
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
