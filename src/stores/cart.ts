"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type CartItem = {
  productId: string
  name: string
  price: number
  unit: string
  quantity: number
  image?: string | null
  status?: string // Статус товара (AVAILABLE, PREORDER, SOON)
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clear: () => void
  totalItems: number
  totalAmount: number
}

const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return { totalItems, totalAmount }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalAmount: 0,
      addItem: (item) => {
        const items = structuredClone(get().items)
        const index = items.findIndex((i) => i.productId === item.productId)
        if (index >= 0) {
          items[index].quantity += item.quantity
        } else {
          items.push(item)
        }
        const totals = calculateTotals(items)
        set({ items, ...totals })
      },
      removeItem: (productId) => {
        const items = get().items.filter((item) => item.productId !== productId)
        const totals = calculateTotals(items)
        set({ items, ...totals })
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) return
        const items = get().items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        )
        const totals = calculateTotals(items)
        set({ items, ...totals })
      },
      clear: () => set({ items: [], totalItems: 0, totalAmount: 0 }),
    }),
    {
      name: "oysters-cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const totals = calculateTotals(state.items)
        state.totalItems = totals.totalItems
        state.totalAmount = totals.totalAmount
      },
    },
  ),
)
