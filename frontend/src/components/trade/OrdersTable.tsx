'use client'

import { useOrders } from '@/hooks/useOrders'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'

export function OrdersTable() {
  const { data, isLoading } = useOrders()

  if (isLoading) return <TableSkeleton rows={2} />

  return (
    <div className="text-center py-10 text-[var(--text-ghost)] text-sm">
      No open limit orders
    </div>
  )
}
