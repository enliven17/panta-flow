'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const LeaderboardTable = dynamic(
  () => import('@/components/leaderboard/LeaderboardTable').then(m => m.LeaderboardTable),
  { ssr: false }
)

export default function LeaderboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#080808]"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[900px] mx-auto w-full p-6 pt-10">
          <div className="mb-8">
            <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.3em] mb-2">Panta Perpetuals</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Leaderboard</h1>
          </div>
          <LeaderboardTable />
        </div>
      </div>
    </motion.div>
  )
}
