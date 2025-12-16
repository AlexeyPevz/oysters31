'use client'

import type { ProductStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Truck, Clock } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { QuickOrderButton } from '@/components/QuickOrderModal'

export type FeaturedProduct = {
  id: string
  name: string
  slug: string
  price: number
  unit: string
  shortDescription: string | null
  status: string
  imageUrls: string[]
  hasVariants?: boolean
  variants?: Array<{
    id: string
    name: string
    size: string | null
    price: number
    stock: number
    isAvailable: boolean
  }>
  isPromoted?: boolean
}

interface Props {
  products: FeaturedProduct[]
}

const statusText: Record<ProductStatus, string> = {
  AVAILABLE: 'В наличии',
  PREORDER: 'Предзаказ',
  SOON: 'Скоро',
  HIDDEN: 'Недоступно',
}

export function FeaturedProducts({ products }: Props) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = (product: FeaturedProduct) => {
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
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            Популярные
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              {' '}позиции
            </span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Подборка свежих устриц и деликатесов, которые чаще всего заказывают наши гости.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <Card key={product.id} className="bg-gray-900/50 border-gray-800 hover:border-yellow-400/50 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-xl mb-1">{product.name}</CardTitle>
                    <p className="text-gray-400 text-sm">{product.shortDescription}</p>
                  </div>
                  <Badge className="bg-gray-800 text-white border border-yellow-400/50">
                    {statusText[product.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 h-48 mb-4 flex items-center justify-center text-yellow-400 text-4xl">
                  {product.imageUrls?.length ? (
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    product.name.charAt(0)
                  )}
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-3xl font-bold text-white">
                      {Number(product.price).toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-gray-400 text-sm ml-1">/ {product.unit}</span>
                  </div>
                  <div className="text-xs text-gray-400 flex gap-3">
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" /> доставка 60 мин
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> всегда свежие
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
                  >
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
