"use client"

import { useState, useEffect } from "react"
import { Clock, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductVariantSelector, ProductVariant } from "@/components/ProductVariantSelector"
import { SupplyCartModal } from "@/components/SupplyCartModal"

type SupplyItem = {
    id: string
    productId: string
    variantId: string | null
    quantity: number
    reservedCount: number
    product: {
        id: string
        name: string
        price: number
        imageUrls: any
        unit: string
        hasVariants?: boolean
        variants?: ProductVariant[]
    }
    variant?: {
        id: string
        name: string
        size: string | null
        price: number
    } | null
}

type Supply = {
    id: string
    name: string
    description: string | null
    supplyDate: Date | string
    bannerImage: string | null
    items: SupplyItem[]
}

export function SupplyBanner({ supply }: { supply: Supply }) {
    const [timeLeft, setTimeLeft] = useState("")
    const [isExpired, setIsExpired] = useState(false)
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [cart, setCart] = useState<{ productId: string; variantId?: string; quantity: number }[]>([])
    const [selectedVariants, setSelectedVariants] = useState<Record<string, ProductVariant>>({})
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime()
            const target = new Date(supply.supplyDate).getTime()
            const difference = target - now

            if (difference <= 0) {
                setIsExpired(true)
                setTimeLeft("Поставка прибыла!")
                return
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((difference % (1000 * 60)) / 1000)

            setTimeLeft(`${days}д ${hours}ч ${minutes}м ${seconds}с`)
        }

        calculateTimeLeft()
        const timer = setInterval(calculateTimeLeft, 1000)
        return () => clearInterval(timer)
    }, [supply.supplyDate])

    const addToCart = (productId: string, quantity: number, variantId?: string) => {
        setCart((prev) => {
            const cartKey = variantId ? `${productId}-${variantId}` : productId
            const existing = prev.find((item) =>
                item.productId === productId && item.variantId === variantId
            )
            if (existing) {
                return prev.map((item) =>
                    item.productId === productId && item.variantId === variantId
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                )
            }
            return [...prev, { productId, variantId, quantity }]
        })
    }

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    if (!isMounted) {
        return (
            <div className="relative w-full min-h-[500px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden mb-12 flex items-center justify-center">
                <div className="text-gray-400">Загрузка...</div>
            </div>
        )
    }

    return (
        <>
            <div
                className="relative w-full min-h-[500px] bg-cover bg-center rounded-3xl overflow-hidden mb-12"
                style={{
                    backgroundImage: supply.bannerImage
                        ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url(${supply.bannerImage})`
                        : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                }}
            >
                <div className="relative z-10 p-8 md:p-12">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">{supply.name}</h1>
                        {supply.description && <p className="text-xl text-gray-300 mb-6">{supply.description}</p>}

                        <div className="flex items-center gap-4 mb-8">
                            <Clock className="h-6 w-6 text-yellow-500" />
                            <div>
                                <p className="text-sm text-gray-400">До поступления</p>
                                <p className={`text-2xl font-bold ${isExpired ? "text-green-400" : "text-yellow-500"}`}>
                                    {timeLeft}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {supply.items.map((item) => {
                                const hasVariants = item.product.hasVariants && item.product.variants && item.product.variants.length > 0
                                const selectedVariant = selectedVariants[item.id]

                                // For variant products, calculate available based on selected variant
                                let available = item.quantity - item.reservedCount
                                let displayPrice = Number(item.product.price)

                                if (hasVariants && selectedVariant) {
                                    displayPrice = selectedVariant.price
                                }

                                const inCart = cart.find((c) =>
                                    c.productId === item.productId &&
                                    (!hasVariants || c.variantId === selectedVariant?.id)
                                )?.quantity || 0

                                // Extract first image URL
                                const getProductImage = () => {
                                    if (!item.product.imageUrls) return null
                                    const urls = Array.isArray(item.product.imageUrls)
                                        ? item.product.imageUrls
                                        : JSON.parse(item.product.imageUrls as string)
                                    return urls[0] || null
                                }
                                const imageUrl = getProductImage()

                                return (
                                    <div key={item.id} className="bg-black/40 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
                                        {imageUrl && (
                                            <img
                                                src={imageUrl}
                                                alt={item.product.name}
                                                className="w-full h-40 object-cover"
                                            />
                                        )}
                                        <div className="p-4">
                                            <h3 className="text-lg font-semibold mb-2">{item.product.name}</h3>

                                            {hasVariants ? (
                                                <>
                                                    <ProductVariantSelector
                                                        variants={item.product.variants!}
                                                        onSelect={(variant) => {
                                                            setSelectedVariants(prev => ({
                                                                ...prev,
                                                                [item.id]: variant
                                                            }))
                                                        }}
                                                        selectedVariantId={selectedVariant?.id}
                                                    />
                                                    {selectedVariant && (
                                                        <>
                                                            <p className="text-sm text-gray-400 mt-3 mb-2">
                                                                Доступно: <span className="text-white font-medium">{available} шт</span>
                                                            </p>
                                                            {inCart > 0 && (
                                                                <p className="text-sm text-yellow-500 mb-2">В корзине: {inCart} шт</p>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-xl font-bold text-yellow-500 mb-2">
                                                        {displayPrice.toLocaleString('ru-RU')} ₽
                                                        <span className="text-sm text-gray-400 font-normal ml-1">/ {item.product.unit}</span>
                                                    </p>
                                                    <p className="text-sm text-gray-400 mb-3">
                                                        Доступно: <span className="text-white font-medium">{available} шт</span>
                                                    </p>
                                                    {inCart > 0 && (
                                                        <p className="text-sm text-yellow-500 mb-2">В корзине: {inCart} шт</p>
                                                    )}
                                                </>
                                            )}

                                            <div className="flex gap-2 mt-3">
                                                <Button
                                                    onClick={() => addToCart(
                                                        item.productId,
                                                        1,
                                                        hasVariants ? selectedVariant?.id : undefined
                                                    )}
                                                    disabled={
                                                        (hasVariants && !selectedVariant) ||
                                                        available <= inCart
                                                    }
                                                    className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 disabled:opacity-50"
                                                    size="sm"
                                                >
                                                    + Добавить
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {totalItems > 0 && (
                            <Button
                                onClick={() => setIsCartOpen(true)}
                                className="bg-yellow-500 text-black hover:bg-yellow-400 text-lg px-8 py-6"
                            >
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Оформить предзаказ ({totalItems} {totalItems === 1 ? "товар" : "товара"})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {isCartOpen && (
                <SupplyCartModal
                    supply={supply}
                    cart={cart}
                    onClose={() => setIsCartOpen(false)}
                    onUpdateCart={setCart}
                />
            )}
        </>
    )
}
