'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ADDRESSES } from '@/lib/contracts/addresses'

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* EarnStats */}
            <div className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] overflow-hidden shadow-2xl">
              <EarnStats isCard />
            </div>

            {/* FaucetCard */}
            <div className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl p-10 flex flex-col">
              <FaucetCard
                tokenAddress={ADDRESSES.USDC}
                symbol="USDC"
                amount="1,000"
                decimals={6}
                isSimple
              />
            </div>

            {/* TokenComposition */}
            <div className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl p-10">
              <h3 className="text-[11px] font-black text-[#555] uppercase tracking-[0.3em] mb-8">Pool Composition</h3>
              <TokenComposition bare />
            </div>

            {/* EarnActions */}
            <div className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl p-10 flex flex-col">
              <h3 className="text-[11px] font-black text-[#555] uppercase tracking-[0.3em] mb-8">Staking Operations</h3>
              <div className="flex-1">
                <EarnActions />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
