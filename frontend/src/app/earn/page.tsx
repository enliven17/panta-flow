'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const TokenComposition = dynamic(() => import('@/components/earn/TokenComposition').then(mod => mod.TokenComposition), { ssr: false })
const EarnStats = dynamic(() => import('@/components/earn/EarnStats').then(mod => mod.EarnStats), { ssr: false })
const EarnActions = dynamic(() => import('@/components/earn/EarnActions').then(mod => mod.EarnActions), { ssr: false })
const FaucetCard = dynamic(() => import('@/components/faucet/FaucetCard').then(mod => mod.FaucetCard), { ssr: false })

const EASE = [0.16, 1, 0.3, 1] as const

const cardVariants = (dir: 'left' | 'right', delay: number) => ({
  hidden: { opacity: 0, x: dir === 'left' ? -52 : 52 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE, delay } },
})

export default function EarnPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full bg-[#080808]"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto w-full p-6 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* EarnStats — from left */}
            <motion.div variants={cardVariants('left', 0.05)} className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] overflow-hidden shadow-2xl">
              <EarnStats isCard />
            </motion.div>

            {/* FaucetCard — from right */}
            <motion.div variants={cardVariants('right', 0.12)} className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl p-10 flex flex-col">
              <FaucetCard symbol="USDC" amount="1,000" isSimple />
            </motion.div>

            {/* TokenComposition — from left */}
            <motion.div variants={cardVariants('left', 0.19)} className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl p-10">
              <h3 className="text-[11px] font-black text-[#555] uppercase tracking-[0.3em] mb-8">Pool Composition</h3>
              <TokenComposition bare />
            </motion.div>

            {/* EarnActions — from right */}
            <motion.div variants={cardVariants('right', 0.26)} className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl p-10 flex flex-col">
              <h3 className="text-[11px] font-black text-[#555] uppercase tracking-[0.3em] mb-8">Staking Operations</h3>
              <div className="flex-1">
                <EarnActions />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
