'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useStats } from '@/hooks/useGlpManager'

const STATS = [
  { label: 'Total Value Locked', key: 'tvl', prefix: '$' },
  { label: '24h Trading Volume', key: 'volume24h', prefix: '$' },
  { label: 'Open Interest', key: 'openInterest', prefix: '$' },
]

export function Stats() {
  const { data: stats } = useStats()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 px-4 bg-[#050505] border-y border-[#111]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 md:gap-24 text-center">
          {STATS.map((stat, i) => {
            const value = stats ? parseFloat((stats as any)[stat.key] || '0') : 0
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ 
                  delay: i * 0.15, 
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.02] transition-colors duration-500 rounded-3xl -inset-y-8 -inset-x-4" />
                
                <p className="relative text-4xl sm:text-5xl md:text-6xl font-black mb-4 tabular-nums tracking-tighter text-white">
                  <span className="opacity-20 mr-1">{stat.prefix}</span>
                  {stats ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                  <span className="absolute -top-4 -right-4 w-12 h-12 bg-white opacity-0 group-hover:opacity-[0.03] blur-2xl rounded-full transition-opacity" />
                </p>
                
                <p className="relative text-[11px] tracking-[0.3em] uppercase text-[#444] font-black group-hover:text-[#666] transition-colors">
                  {stat.label}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
