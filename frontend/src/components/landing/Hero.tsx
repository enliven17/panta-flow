'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 py-32 overflow-hidden bg-[#050505]">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#1A33FF] opacity-[0.03] blur-[150px]" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full bg-[#8A33FF] opacity-[0.03] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl relative z-10"
      >
        {/* Futuristic Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] mb-12 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        >
          <div className="w-2 h-2 rounded-full bg-[#1A33FF] shadow-[0_0_10px_#1A33FF]" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-bold">
            Redefining Leverage Trading
          </span>
        </motion.div>
 
        {/* Main Title - Split for animation */}
        <h1 className="text-[80px] sm:text-[120px] md:text-[140px] font-black tracking-[-0.05em] mb-8 leading-[0.8] text-white">
          {'PANTA'.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{
                delay: 0.3 + i * 0.08,
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block relative"
            >
              {char}
            </motion.span>
          ))}
        </h1>

        {/* Dynamic subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-lg sm:text-xl md:text-2xl text-[#888] mb-16 max-w-2xl mx-auto font-medium"
        >
          Institutional grade platform for <span className="text-white">BTC</span> and <span className="text-white">ETH</span>. <br className="hidden sm:block" />
          Trade with pinpoint accuracy up to <span className="text-white">10x</span>.
        </motion.p>

        {/* Premium CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link
            href="/trade"
            className="group relative h-16 px-10 flex items-center justify-center rounded-2xl bg-white text-black font-black text-sm uppercase tracking-wider hover:bg-[#EEE] active:scale-[0.97] transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] overflow-hidden"
          >
            Start Trading
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-2 group-hover:translate-x-1 transition-transform">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>
          <Link
            href="/faucet"
            className="h-16 px-10 flex items-center justify-center rounded-2xl border border-[#1A1A1A] bg-transparent text-[#666] font-bold text-sm uppercase tracking-wider hover:text-white hover:border-[#333] active:scale-[0.97] transition-all"
          >
            Documentation
          </Link>
        </motion.div>
      </motion.div>

      {/* Decorative vertical line */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: 120 }}
        transition={{ delay: 1.5, duration: 1.5, ease: 'easeInOut' }}
        className="absolute bottom-0 w-[1px] bg-gradient-to-t from-[#333] to-transparent opacity-20"
      />
    </section>
  )
}
