'use client'

// Limit orders are not yet supported on Flow
// Returns empty stub so OrdersTable renders gracefully
export function useOrders() {
  return { data: [], isLoading: false }
}
