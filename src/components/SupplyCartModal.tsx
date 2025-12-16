"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { X, Loader2, Minus, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateTimeSlots, getDeliveryDates, formatDeliveryDate } from "@/lib/utils/timeslots"

type SupplyItem = {
    id: string
    productId: string
    quantity: number
    reservedQty: number
    product: {
        id: string
        name: string
        price: number
    }
}

type Supply = {
    id: string
    supplyDate: Date | string
    items: SupplyItem[]
}

type CartItem = {
    productId: string
    variantId?: string
    quantity: number
}

export function SupplyCartModal({
    supply,
    cart,
    onClose,
    onUpdateCart,
}: {
    supply: Supply
    cart: CartItem[]
    onClose: () => void
    onUpdateCart: (cart: CartItem[]) => void
}) {
    const [formData, setFormData] = useState({
        deliveryDate: "",
        deliveryTimeSlot: "",
        clientName: "",
        phone: "",
        email: "",
        deliveryAddress: "",
    })

    const timeSlots = generateTimeSlots()
    const deliveryDates = getDeliveryDates(supply.supplyDate)

    const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
        const item = supply.items.find((i) =>
            i.productId === productId &&
            (!variantId || i.variantId === variantId)
        )
        if (!item) return

        const available = item.quantity - item.reservedCount
        const currentQty = cart.find((c) =>
            c.productId === productId && c.variantId === variantId
        )?.quantity || 0
        const newQty = currentQty + delta

        if (newQty <= 0) {
            onUpdateCart(cart.filter((c) =>
                !(c.productId === productId && c.variantId === variantId)
            ))
        } else if (newQty <= available) {
            onUpdateCart(
                cart.map((c) =>
                    c.productId === productId && c.variantId === variantId
                        ? { ...c, quantity: newQty }
                        : c
                )
            )
        } else {
            toast.error(`Доступно только ${available} шт`)
        }
    }

    const removeItem = (productId: string, variantId: string | undefined) => {
        onUpdateCart(cart.filter((c) =>
            !(c.productId === productId && c.variantId === variantId)
        ))
    }

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            // Создаем запись для каждого товара в корзине
            const promises = cart.map((cartItem) =>
                fetch(`/api/supplies/${supply.id}/waitlist`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...data,
                        productId: cartItem.productId,
                        quantity: cartItem.quantity,
                    }),
                })
            )

            const responses = await Promise.all(promises)
            const failed = responses.filter((r) => !r.ok)

            if (failed.length > 0) {
                const error = await failed[0].json()
                throw new Error(error.error || "Ошибка записи")
            }

            return responses
        },
        onSuccess: () => {
            toast.success("Вы успешно записаны в лист ожидания!")
            onClose()
            window.location.reload()
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "Ошибка записи")
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.deliveryDate || !formData.deliveryTimeSlot) {
            toast.error("Выберите дату и время доставки")
            return
        }
        if (!formData.deliveryAddress) {
            toast.error("Введите адрес доставки")
            return
        }
        mutation.mutate(formData)
    }

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Оформление предзаказа</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Ваш заказ ({totalItems} товаров)</h3>
                        <div className="space-y-4 mb-6">
                            {cart.map((cartItem) => {
                                const supplyItem = supply.items.find((i) =>
                                    i.productId === cartItem.productId &&
                                    (!cartItem.variantId || i.variantId === cartItem.variantId)
                                )
                                if (!supplyItem) return null

                                const product = supplyItem.product
                                const variant = supplyItem.variant
                                const price = variant ? Number(variant.price) : Number(product.price)
                                const subtotal = price * cartItem.quantity

                                // Extract first image
                                const getProductImage = () => {
                                    if (!product.imageUrls) return null
                                    const urls = Array.isArray(product.imageUrls)
                                        ? product.imageUrls
                                        : JSON.parse(product.imageUrls as string)
                                    return urls[0] || null
                                }
                                const imageUrl = getProductImage()

                                return (
                                    <div key={`${cartItem.productId}-${cartItem.variantId || 'no-variant'}`} className="flex gap-4 bg-gray-800/50 p-4 rounded-lg">
                                        {imageUrl && (
                                            <img
                                                src={imageUrl}
                                                alt={product.name}
                                                className="w-20 h-20 object-cover rounded"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-semibold mb-1">{product.name}</h3>
                                            {variant && (
                                                <p className="text-sm text-gray-400 mb-1">
                                                    {variant.name}{variant.size ? ` (${variant.size})` : ''}
                                                </p>
                                            )}
                                            <p className="text-yellow-500 font-bold">
                                                {price.toLocaleString('ru-RU')} ₽
                                                <span className="text-sm text-gray-400 font-normal ml-1">× {cartItem.quantity}</span>
                                            </p>
                                            <p className="text-sm text-gray-300 mt-1">
                                                Итого: {subtotal.toLocaleString('ru-RU')} ₽
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateQuantity(cartItem.productId, cartItem.variantId, -1)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-8 text-center">{cartItem.quantity}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateQuantity(cartItem.productId, cartItem.variantId, 1)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => removeItem(cartItem.productId, cartItem.variantId)}
                                                className="text-red-500 hover:text-red-400"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="border-t border-gray-700 pt-4 mb-6">
                            <div className="flex justify-between text-lg font-bold">
                                <span>Итого:</span>
                                <span className="text-yellow-500">
                                    {cart.reduce((sum, item) => {
                                        const supplyItem = supply.items.find((i) =>
                                            i.productId === item.productId &&
                                            (!item.variantId || i.variantId === item.variantId)
                                        )
                                        if (!supplyItem) return sum
                                        const price = supplyItem.variant
                                            ? Number(supplyItem.variant.price)
                                            : Number(supplyItem.product.price)
                                        return sum + (price * item.quantity)
                                    }, 0).toLocaleString('ru-RU')} ₽
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 text-right">
                            Предварительная сумма заказа
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Дата доставки</Label>
                            <select
                                value={formData.deliveryDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
                                required
                            >
                                <option value="">Выберите дату</option>
                                {deliveryDates.map((date) => (
                                    <option key={date.toISOString()} value={date.toISOString()}>
                                        {formatDeliveryDate(date)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label>Время доставки</Label>
                            <select
                                value={formData.deliveryTimeSlot}
                                onChange={(e) => setFormData((prev) => ({ ...prev, deliveryTimeSlot: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
                                required
                            >
                                <option value="">Выберите время</option>
                                {timeSlots.map((slot) => (
                                    <option key={slot.id} value={slot.id}>
                                        {slot.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label>Ваше имя</Label>
                            <Input
                                value={formData.clientName}
                                onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                                className="bg-gray-800 border-gray-700"
                                required
                            />
                        </div>

                        <div>
                            <Label>Телефон</Label>
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                className="bg-gray-800 border-gray-700"
                                placeholder="+7 (999) 123-45-67"
                                required
                            />
                        </div>

                        <div>
                            <Label>Email (опционально)</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                className="bg-gray-800 border-gray-700"
                            />
                        </div>

                        <div>
                            <Label>Адрес доставки</Label>
                            <Input
                                value={formData.deliveryAddress}
                                onChange={(e) => setFormData((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
                                className="bg-gray-800 border-gray-700"
                                placeholder="ул. Примерная, д. 1, кв. 1"
                                required
                            />
                        </div>

                        <Button type="submit" disabled={mutation.isPending || cart.length === 0} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Записываем...
                                </>
                            ) : (
                                `Записаться в лист ожидания (${totalItems} товаров)`
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
