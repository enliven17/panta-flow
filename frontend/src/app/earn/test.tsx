'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
const TokenComposition = dynamic(() => import('@/components/earn/TokenComposition').then(mod => mod.TokenComposition), { ssr: false })
const EarnStats = dynamic(() => import('@/components/earn/EarnStats').then(mod => mod.EarnStats), { ssr: false })
const EarnActions = dynamic(() => import('@/components/earn/EarnActions').then(mod => mod.EarnActions), { ssr: false })
const FaucetCard = dynamic(() => import('@/components/faucet/FaucetCard').then(mod => mod.FaucetCard), { ssr: false })

export default function EarnPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#080808]"
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto w-full p-6 h-full"> 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
             <div>Test</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
