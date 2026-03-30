'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PLPCard } from './PLPCard'
import { PantaCard } from './PantaCard'
import { RewardsCard } from './RewardsCard'

type EarnTab = 'PLP' | 'PANTA' | 'REWARDS'

export function EarnActions() {
  const [activeTab, setActiveTab] = useState<EarnTab>('PLP')

  return (
    <div className="flex flex-col h-full">
      {/* Tab Switcher */}
      <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111] mb-4">
        {(['PLP', 'PANTA', 'REWARDS'] as EarnTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[13px] font-black rounded-xl transition-all duration-200 uppercase tracking-widest ${
              activeTab === tab
                ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm'
                : 'text-[#444] hover:text-[#666]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'PLP' && <PLPCard isSimple />}
        {activeTab === 'PANTA' && <PantaCard isSimple />}
        {activeTab === 'REWARDS' && <RewardsCard isSimple />}
      </div>
    </div>
  )
}
