'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const FEATURES = [
  {
    title: 'Precision Powered',
    subtitle: '10x Leverage',
    description: 'Engineered for accuracy. Trade BTC and ETH with high-performance execution and optimized leverage.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" />
      </svg>
    ),
  },
  {
    title: 'Native Integrity',
    subtitle: 'Flow Oracle',
    description: 'Direct integration with IncrementFi oracle on Flow. Experience zero-latency price feeds on-chain.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m16 12-4-4-4 4M12 8v8" />
      </svg>
    ),
  },
  {
    title: 'Liquidity First',
    subtitle: '70% Real Yield',
    description: 'PLP holders earn the majority of protocol revenue. Real yield distributed in native assets.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    title: 'Pure Focus',
    subtitle: 'BTC & ETH Only',
    description: 'We prioritize quality over quantity. Deep liquidity for the industry\'s core assets.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m11 4-7 16 11-4 6 4-10-16z" />
      </svg>
    ),
  },
]

export function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 px-4 bg-[#050505]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            className="px-4 py-1.5 rounded-full border border-[#1A1A1A] text-[10px] uppercase tracking-[0.3em] font-black text-[#444] mb-6"
          >
            Protocol DNA
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-black text-white text-center tracking-tight">The Panta Advantage</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#111] border border-[#111] overflow-hidden rounded-[32px]">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              className="bg-[#080808] p-12 hover:bg-[#0A0A0A] transition-colors group relative"
            >
              <div className="mb-10 w-12 h-12 rounded-2xl bg-[#111] border border-[#1A1A1A] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              
              <div className="flex flex-col gap-2 mb-6">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#333] group-hover:text-white transition-colors duration-500">
                  {feature.subtitle}
                </span>
                <h3 className="text-2xl font-black text-white">{feature.title}</h3>
              </div>
              
              <p className="text-[#666] font-medium leading-relaxed max-w-sm">
                {feature.description}
              </p>

              {/* Minimal arrow deco */}
              <div className="absolute bottom-12 right-12 opacity-0 group-hover:opacity-10 transition-opacity">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
