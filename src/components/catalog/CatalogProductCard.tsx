'use client'

import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuickOrderButton } from '@/components/QuickOrderModal'
import { useCartStore } from '@/stores/cart'
import type { FeaturedProduct } from '@/components/FeaturedProducts'

export function CatalogProductCard({ product }: { product: FeaturedProduct }) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit,
      quantity: 1,
      image: product.imageUrls?.[0] ?? null,
      status: product.status,
    })
  }

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white text-lg font-semibold">{product.name}</h3>
          <p className="text-gray-400 text-sm line-clamp-2">{product.shortDescription}</p>
        </div>
        <Badge className="bg-gray-800 text-white border border-yellow-400/40">{product.status === 'AVAILABLE' ? 'В наличии' : 'Предзаказ'}</Badge>
      </div>
      <div className="rounded-xl bg-gray-800/40 h-48 mb-4 flex items-center justify-center text-yellow-400 text-4xl">
        {product.imageUrls?.length ? (
          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover rounded-xl" />
        ) : (
          product.name.charAt(0)
        )}
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-3xl font-bold text-white">{Number(product.price).toLocaleString('ru-RU')} ₽</p>
          <p className="text-gray-400 text-sm">за {product.unit}</p>
        </div>
        <div className="text-xs text-gray-400">
          <p>• Быстрая доставка</p>
          <p>• Контроль температуры</p>
        </div>
      </div>
      <div className="flex gap-2 mt-auto">
        <Button className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400" onClick={handleAdd}>
          <ShoppingCart className="h-4 w-4 mr-2" /> В корзину
        </Button>
        <QuickOrderButton
          product={{
            id: product.id,
            name: product.name,
            price: Number(product.price),
            unit: product.unit,
          }}
        />
      </div>
    </div>
  )
}
