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
        <div className="max-w-[1280px] mx-auto w-full p-6 pt-10">
          <motion.div
            variants={{ hidden: { opacity: 0, x: -48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } } }}
            className="mb-10 flex items-end justify-between"
          >
            <div>
              <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.4em] mb-3">Community Rankings</p>
              <h1 className="text-4xl font-black text-white tracking-tighter">Leaderboard</h1>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em]">Updated</p>
              <p className="text-xs font-mono text-[#666]">Real-time</p>
            </div>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.1 } } }}
          >
            <LeaderboardTable />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
