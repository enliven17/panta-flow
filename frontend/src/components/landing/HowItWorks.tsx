'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'

const STEPS = [
  {
    step: '01',
    title: 'Connect Wallet',
    description: 'Securely link your wallet to the Panta protocol. Supporting all major EVM providers.',
    cta: { href: '/trade', label: 'Connect' },
  },
  {
    step: '02',
    title: 'Execute Trades',
    description: 'Experience deep liquidity on BTC and ETH. Open positions with up to 10x leverage.',
    cta: { href: '/trade', label: 'Trade Now' },
  },
  {
    step: '03',
    title: 'Monitor & Earn',
    description: 'Track your performance in real-time or provide liquidity via PLP to earn protocol fees.',
    cta: { href: '/earn', label: 'Start Earning' },
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-32 px-4 bg-[#050505] border-t border-[#111]" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            className="px-4 py-1.5 rounded-full border border-[#1A1A1A] text-[10px] uppercase tracking-[0.3em] font-black text-[#444] mb-6"
          >
            Seamless Integration
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-black text-white text-center tracking-tight">The Trading Journey</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.8 }}
              className="group relative"
            >
              <div className="absolute -top-12 left-0 text-[100px] font-black text-white/[0.03] leading-none pointer-events-none group-hover:text-white/[0.08] transition-colors">
                {step.step}
              </div>
              
              <div className="relative pt-12">
                <h3 className="text-2xl font-black text-white mb-4">{step.title}</h3>
                <p className="text-[#666] font-medium leading-relaxed mb-8 max-w-[240px]">
                  {step.description}
                </p>
                
                <Link
                  href={step.cta.href}
                  className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-[#444] group-hover:text-white transition-colors"
                >
                  {step.cta.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
              </div>

              {/* Connecting line on desktop */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-[60px] -right-6 w-12 h-[1px] bg-[#111]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
