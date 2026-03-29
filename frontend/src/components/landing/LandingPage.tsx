'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

/* ────────────────────────────────────────────────────────────────────────────
 * Background color sets — must stay in sync with SceneCanvas COLOR_SETS
 * ──────────────────────────────────────────────────────────────────────────── */

const CYCLE_PERIOD = 6 // seconds
const BG_COLORS = [
  { r: 2,  g: 6,  b: 3  },  // deep black-green
  { r: 1,  g: 3,  b: 2  },  // near black
  { r: 2,  g: 7,  b: 4  },  // dark green tint
  { r: 1,  g: 4,  b: 2  },  // very dark green
] as const

function lerpColor(
  a: (typeof BG_COLORS)[number],
  b: (typeof BG_COLORS)[number],
  t: number,
) {
  return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`
}

/* ────────────────────────────────────────────────────────────────────────────
 * Animation helpers
 * ──────────────────────────────────────────────────────────────────────────── */

const clipRevealEase = [0.16, 1, 0.3, 1] as const

const TAGS = ['BTC/USD', 'ETH/USD', 'Up to 10x'] as const

function ClipRevealLine({
  text,
  index,
  className = '',
}: {
  text: string
  index: number
  className?: string
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className={`block ${className}`}
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1, delay: 0.15 + index * 0.12, ease: clipRevealEase }}
      >
        {text}
      </motion.span>
    </span>
  )
}

function FadeBlurIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, delay, ease: clipRevealEase }}
    >
      {children}
    </motion.div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Typewriter hook
 * ──────────────────────────────────────────────────────────────────────────── */

const WORDS = ['motion.', 'trading.']
const TYPE_SPEED = 80   // ms per char typed
const DELETE_SPEED = 50 // ms per char deleted
const PAUSE_AFTER = 1800 // ms to hold before deleting

function useTypewriter() {
  const [display, setDisplay] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing')

  useEffect(() => {
    const word = WORDS[wordIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (display.length < word.length) {
        timeout = setTimeout(() => setDisplay(word.slice(0, display.length + 1)), TYPE_SPEED)
      } else {
        timeout = setTimeout(() => setPhase('pausing'), PAUSE_AFTER)
      }
    } else if (phase === 'pausing') {
      setPhase('deleting')
    } else {
      if (display.length > 0) {
        timeout = setTimeout(() => setDisplay(display.slice(0, -1)), DELETE_SPEED)
      } else {
        setWordIdx((i) => (i + 1) % WORDS.length)
        setPhase('typing')
      }
    }

    return () => clearTimeout(timeout)
  }, [display, phase, wordIdx])

  return display
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main Component
 * ──────────────────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const bgRef = useRef<HTMLDivElement>(null)
  const typedWord = useTypewriter()

  useEffect(() => {
    let rafId: number
    const tick = () => {
      if (bgRef.current) {
        const elapsed = performance.now() / 1000
        const phase = (elapsed / CYCLE_PERIOD) % 4
        const segA = Math.floor(phase) % 4
        const segB = (segA + 1) % 4
        const frac = phase - Math.floor(phase)
        const smooth = frac * frac * (3 - 2 * frac)
        bgRef.current.style.backgroundColor = lerpColor(BG_COLORS[segA], BG_COLORS[segB], smooth)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <>
      {/* ── Animated Background (z-0) ───────────────────────────────── */}
      <div
        ref={bgRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* ── Left gradient overlay for text readability (z-6) ─────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 6,
          background:
            'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)',
        }}
      />

      {/* ── Bottom gradient overlay (z-6) ───────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 6,
          height: 160,
          background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
        }}
      />

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="h-screen relative">
        <div
          className="absolute bottom-0 left-0 z-20 max-w-2xl"
          style={{ padding: '80px 56px' }}
        >


          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-[1.08] mb-8">
            <ClipRevealLine text="Perpetual" index={0} />
            <span className="block text-[#00C076]">
              {typedWord}
              <span className="inline-block w-[3px] h-[0.85em] bg-[#00C076] ml-1 align-middle animate-pulse" />
            </span>
          </h1>

          <FadeBlurIn delay={0.55}>
            <p className="text-sm sm:text-base text-white/40 font-medium max-w-sm mb-10 leading-relaxed">
              BTC and ETH perpetuals with up to 10x leverage.
              Institutional-grade execution on Flow.
            </p>
          </FadeBlurIn>

          <FadeBlurIn delay={0.7}>
            <div className="flex items-center gap-3 mb-8">
              <Link
                href="/trade"
                className="group relative h-12 px-8 flex items-center gap-2.5 rounded-xl overflow-hidden font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #00C076 0%, #00E090 100%)' }}
              >
                {/* Shine sweep on hover */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }}
                />
                <span className="relative text-white">Start Trading</span>
                <svg
                  className="relative"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                href="/faucet"
                className="h-12 px-8 flex items-center rounded-xl font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.97] text-white/50 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                Get Test Tokens
              </Link>
            </div>
          </FadeBlurIn>

          <FadeBlurIn delay={0.85}>
            <div className="flex items-center gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/8 text-[10px] font-bold text-white/30 uppercase tracking-widest"
                >
                  {tag}
                </span>
              ))}
            </div>
          </FadeBlurIn>
        </div>
      </section>
    </>
  )
}
