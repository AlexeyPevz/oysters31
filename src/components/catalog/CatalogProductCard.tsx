'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuickOrderButton } from '@/components/QuickOrderModal'
import { useCartStore } from '@/stores/cart'
import { ProductVariantSelector, type ProductVariant } from '@/components/ProductVariantSelector'
import type { FeaturedProduct } from '@/components/FeaturedProducts'

export function CatalogProductCard({ product }: { product: FeaturedProduct }) {
  const addItem = useCartStore((state) => state.addItem)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  const handleAdd = () => {
    // If product has variants, use selected variant price, otherwise use product price
    const price = selectedVariant ? selectedVariant.price : Number(product.price)
    const displayName = selectedVariant
      ? `${product.name} ${selectedVariant.name}${selectedVariant.size ? ` (${selectedVariant.size})` : ''}`
      : product.name

    addItem({
      productId: product.id,
      name: displayName,
      price: price,
      unit: product.unit,
      quantity: 1,
      image: product.imageUrls?.[0] ?? null,
      status: product.status,
    })
  }

  // Show variant selector if product has variants
  const hasVariants = product.hasVariants && product.variants && product.variants.length > 0
  const displayPrice = selectedVariant ? selectedVariant.price : Number(product.price)
  const canAddToCart = !hasVariants || selectedVariant !== null

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

      {/* Show variant selector if product has variants */}
      {hasVariants ? (
        <div className="mb-4">
          <ProductVariantSelector
            variants={product.variants!}
            onSelect={setSelectedVariant}
            selectedVariantId={selectedVariant?.id}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-white">{displayPrice.toLocaleString('ru-RU')} ₽</p>
            <p className="text-gray-400 text-sm">за {product.unit}</p>
          </div>
          <div className="text-xs text-gray-400">
            <p>• Быстрая доставка</p>
            <p>• Контроль температуры</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <Button
          className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAdd}
          disabled={!canAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {hasVariants && !selectedVariant ? 'Выберите размер' : 'В корзину'}
        </Button>
        {!hasVariants && (
          <QuickOrderButton
            product={{
              id: product.id,
              name: product.name,
              price: Number(product.price),
              unit: product.unit,
            }}
          />
        )}
      </div>
    </div>
  )
}
