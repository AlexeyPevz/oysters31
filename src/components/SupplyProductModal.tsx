"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { X, Loader2 } from "lucide-react"
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
}

export function SupplyProductModal({ supply, supplyItem, onClose }: { supply: Supply; supplyItem: SupplyItem; onClose: () => void }) {
    const available = supplyItem.quantity - supplyItem.reservedQty
    const [formData, setFormData] = useState({
        quantity: 1,
        deliveryDate: "",
        deliveryTimeSlot: "",
        clientName: "",
        phone: "",
        email: "",
        deliveryAddress: "",
    })

    const timeSlots = generateTimeSlots()
    const deliveryDates = getDeliveryDates(supply.supplyDate)

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await fetch(`/api/supplies/${supply.id}/waitlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    productId: supplyItem.productId,
                }),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Ошибка записи")
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success("Вы успешно записаны в лист ожидания!")
            onClose()
            // Перезагрузим страницу чтобы обновить остатки
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
        if (formData.quantity > available) {
            toast.error(`Доступно только ${available} шт`)
            return
        }
        mutation.mutate(formData)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">{supplyItem.product.name}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Количество</Label>
                            <Input
                                type="number"
                                min={1}
                                max={available}
                                value={formData.quantity}
                                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                                className="bg-gray-800 border-gray-700"
                            />
                            <p className="text-sm text-gray-400 mt-1">Доступно: {available} шт</p>
                        </div>

                        <div>
                            <Label>Дата доставки</Label>
                            <select value={formData.deliveryDate} onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white" required>
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
                            <select value={formData.deliveryTimeSlot} onChange={(e) => setFormData((prev) => ({ ...prev, deliveryTimeSlot: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white" required>
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
                            <Input value={formData.clientName} onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))} className="bg-gray-800 border-gray-700" required />
                        </div>

                        <div>
                            <Label>Телефон</Label>
                            <Input type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} className="bg-gray-800 border-gray-700" placeholder="+7 (999) 123-45-67" required />
                        </div>

                        <div>
                            <Label>Email (опционально)</Label>
                            <Input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="bg-gray-800 border-gray-700" />
                        </div>

                        <div>
                            <Label>Адрес доставки</Label>
                            <Input value={formData.deliveryAddress} onChange={(e) => setFormData((prev) => ({ ...prev, deliveryAddress: e.target.value }))} className="bg-gray-800 border-gray-700" placeholder="ул. Примерная, д. 1, кв. 1" required />
                        </div>

                        <Button type="submit" disabled={mutation.isPending} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Записываем...
                                </>
                            ) : (
                                "Записаться в лист ожидания"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
