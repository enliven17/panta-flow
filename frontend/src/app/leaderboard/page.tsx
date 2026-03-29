'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const LeaderboardTable = dynamic(
  () => import('@/components/leaderboard/LeaderboardTable').then(m => m.LeaderboardTable),
  { ssr: false }
)

const EASE = [0.16, 1, 0.3, 1] as const

export default function LeaderboardPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full bg-[#080808]"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[900px] mx-auto w-full p-6 pt-10">
          <motion.div
            variants={{ hidden: { opacity: 0, x: -48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } } }}
            className="mb-8"
          >
            <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.3em] mb-2">Panta Perpetuals</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Leaderboard</h1>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, x: 48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE, delay: 0.1 } } }}
          >
            <LeaderboardTable />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
