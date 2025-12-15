"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useCartStore } from "@/stores/cart"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Calendar, Bell } from "lucide-react"
import { getAvailableDeliveryDates } from "@/lib/utils/dates"
import { getAvailableHourlySlots, type HourlySlot } from "@/lib/utils/time-slots"

// Старые слоты для обратной совместимости (будут заменены на часовые)
const legacyDeliverySlots = [
  { id: "MORNING", name: "Утро (9:00-12:00)" },
  { id: "DAY", name: "День (12:00-16:00)" },
  { id: "EVENING", name: "Вечер (16:00-20:00)" },
]

const paymentMethods = [
  { id: "CASH", name: "Наличные курьеру" },
  { id: "ONLINE", name: "Онлайн" },
]

export default function CartPage() {
  const { toast } = useToast()
  const { items, totalAmount, updateQuantity, removeItem, clear } = useCartStore()
  const checkoutFormId = "cart-checkout-form"
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [consent, setConsent] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    house: "",
    flat: "",
    porch: "",
    floor: "",
    comment: "",
    deliveryDate: new Date().toISOString().split("T")[0],
    deliverySlot: "DAY", // Старый формат для обратной совместимости
    hourlySlot: "", // Новый часовой слот (например, "09:00-10:00")
    paymentMethod: "CASH",
    selectedDropId: "",
    notifyBeforeHours: 1,
    useHourlySlots: true, // Переключатель между старыми и новыми слотами
  })

  // Получаем доступные часовые слоты для выбранной даты
  const availableHourlySlots = getAvailableHourlySlots(formData.deliveryDate)

  // Инициализируем часовой слот при первой загрузке
  useEffect(() => {
    if (formData.useHourlySlots && !formData.hourlySlot && availableHourlySlots.length > 0) {
      setFormData((prev) => ({ ...prev, hourlySlot: availableHourlySlots[0].id }))
    }
  }, [formData.deliveryDate, formData.useHourlySlots])

  // Проверяем наличие товаров PREORDER и загружаем дропы
  const hasPreorder = items.some((item) => item.status === "PREORDER")
  const productIds = items.map((item) => item.productId)

  const { data: availableDrops = [] } = useQuery({
    queryKey: ["cart-drops", productIds],
    queryFn: async () => {
      if (!hasPreorder || productIds.length === 0) return []
      const response = await fetch("/api/cart/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      })
      if (!response.ok) return []
      return response.json()
    },
    enabled: hasPreorder && productIds.length > 0,
  })

  // Вычисляем доступные даты доставки на основе выбранного дропа
  const selectedDrop = availableDrops.find((d: any) => d.id === formData.selectedDropId)
  const availableDeliveryDates = selectedDrop
    ? getAvailableDeliveryDates(new Date(selectedDrop.dropDate), 3).map((d) => d.toISOString().split("T")[0])
    : []

  // Обновляем дату доставки при выборе дропа
  useEffect(() => {
    if (selectedDrop && availableDeliveryDates.length > 0 && !availableDeliveryDates.includes(formData.deliveryDate)) {
      setFormData((prev) => ({ ...prev, deliveryDate: availableDeliveryDates[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedDropId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!items.length || !consent) return

    // Проверка выбора дропа для предзаказов
    if (hasPreorder && !formData.selectedDropId) {
      toast({
        title: "Ошибка",
        description: "Для предзаказа необходимо выбрать дату поступления товара",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          price: item.price,
          quantity: item.quantity,
        })),
        customer: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
        },
        delivery: {
          street: formData.street,
          house: formData.house,
          flat: formData.flat || undefined,
          porch: formData.porch || undefined,
          floor: formData.floor || undefined,
          comment: formData.comment || undefined,
          date: formData.deliveryDate,
          slot: formData.deliverySlot, // Для обратной совместимости
          hourlySlot: formData.useHourlySlots && formData.hourlySlot ? formData.hourlySlot : undefined,
        },
        paymentMethod: formData.paymentMethod,
        promoCode: undefined,
        consent: true,
        dropId: formData.selectedDropId || undefined,
        notifyBeforeHours: formData.notifyBeforeHours,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Не удалось оформить заказ" }))
        throw new Error(error.error)
      }

      await response.json()
      clear()
      toast({ title: "Заказ оформлен", description: "Мы свяжемся с вами для подтверждения." })
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const itemsCount = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  const disabled = !items.length || !consent || isSubmitting

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="pt-24 pb-32 lg:pb-16">
        <div className="container mx-auto px-4 grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <h1 className="text-3xl font-bold">Корзина</h1>
            {items.length === 0 ? (
              <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center text-gray-300">
                В корзине пока пусто. Добавьте продукты из каталога, чтобы оформить заказ.
              </div>
            ) : (
              items.map((item) => (
                <div key={item.productId} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 flex gap-4 items-start">
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{item.name}</p>
                    <p className="text-gray-400 text-sm">{item.unit}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                        className="w-24 bg-gray-800 border-gray-700"
                      />
                      <p className="text-xl font-bold">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-400" onClick={() => removeItem(item.productId)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))
            )}
          </section>

          <section className="space-y-4">
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xl font-semibold">Оформление заказа</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="name">Имя</Label>
                    <Input id="name" required value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Телефон</Label>
                    <Input id="phone" required value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (по желанию)</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Улица</Label>
                    <Input required value={formData.street} onChange={(event) => setFormData((prev) => ({ ...prev, street: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label>Дом</Label>
                    <Input required value={formData.house} onChange={(event) => setFormData((prev) => ({ ...prev, house: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label>Квартира</Label>
                    <Input value={formData.flat} onChange={(event) => setFormData((prev) => ({ ...prev, flat: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label>Подъезд</Label>
                    <Input value={formData.porch} onChange={(event) => setFormData((prev) => ({ ...prev, porch: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label>Этаж</Label>
                    <Input value={formData.floor} onChange={(event) => setFormData((prev) => ({ ...prev, floor: event.target.value }))} className="bg-gray-800 border-gray-700" />
                  </div>
                </div>
                {hasPreorder && availableDrops.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Calendar className="h-4 w-4" />
                      <Label className="text-yellow-400">Выберите дроп для предзаказа</Label>
                    </div>
                    <Select
                      value={formData.selectedDropId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, selectedDropId: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Выберите дату поступления товара" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800 text-white">
                        {availableDrops.map((drop: any) => (
                          <SelectItem key={drop.id} value={drop.id}>
                            {drop.product.name} - {new Date(drop.dropDate).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedDrop && (
                      <p className="text-sm text-gray-400">
                        Доступные даты доставки: {availableDeliveryDates.map((d) => new Date(d).toLocaleDateString("ru-RU")).join(", ")}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Дата доставки</Label>
                    <Input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(event) => setFormData((prev) => ({ ...prev, deliveryDate: event.target.value }))}
                      className="bg-gray-800 border-gray-700"
                      min={hasPreorder && availableDeliveryDates.length > 0 ? availableDeliveryDates[0] : undefined}
                      max={hasPreorder && availableDeliveryDates.length > 0 ? availableDeliveryDates[availableDeliveryDates.length - 1] : undefined}
                    />
                    {hasPreorder && !selectedDrop && (
                      <p className="text-xs text-yellow-400 mt-1">Выберите дроп выше для предзаказа</p>
                    )}
                  </div>
                  <div>
                    <Label>Временной слот</Label>
                    {formData.useHourlySlots ? (
                      <Select
                        value={formData.hourlySlot || availableHourlySlots[0]?.id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, hourlySlot: value }))}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Выберите время" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-[300px]">
                          {availableHourlySlots.length > 0 ? (
                            availableHourlySlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.id} className="text-white">
                                {slot.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              Нет доступных слотов
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={formData.deliverySlot} onValueChange={(value) => setFormData((prev) => ({ ...prev, deliverySlot: value }))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800 text-white">
                          {legacyDeliverySlots.map((slot) => (
                            <SelectItem key={slot.id} value={slot.id} className="text-white">
                              {slot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.useHourlySlots ? "Часовые слоты (08:00-22:00)" : "Широкие временные окна"}
                    </p>
                  </div>
                  <div>
                    <Label>Оплата</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800 text-white">
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id} className="text-white">
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Уведомить за (часов)
                    </Label>
                    <Select
                      value={String(formData.notifyBeforeHours)}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, notifyBeforeHours: Number(value) }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800 text-white">
                        <SelectItem value="1">За 1 час</SelectItem>
                        <SelectItem value="2">За 2 часа</SelectItem>
                        <SelectItem value="3">За 3 часа</SelectItem>
                        <SelectItem value="6">За 6 часов</SelectItem>
                        <SelectItem value="12">За 12 часов</SelectItem>
                        <SelectItem value="24">За сутки</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Комментарий</Label>
                  <Textarea value={formData.comment} onChange={(event) => setFormData((prev) => ({ ...prev, comment: event.target.value }))} className="bg-gray-800 border-gray-700" rows={3} placeholder="Например, собрать в подарочную упаковку" />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox checked={consent} onCheckedChange={(checked) => setConsent(Boolean(checked))} />
                  <p className="text-sm text-gray-400">Я соглашаюсь с политикой обработки персональных данных и правилами сервиса.</p>
                </div>
                <Button type="submit" disabled={disabled} className="hidden w-full bg-yellow-500 text-black hover:bg-yellow-400 lg:block">
                  {isSubmitting ? 'Отправляем…' : 'Подтвердить заказ'}
                </Button>
              </form>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
              <div className="flex justify-between text-gray-300">
                <span>Сумма заказа</span>
                <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-white font-semibold text-xl mt-2">
                <span>Итого</span>
                <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <CartStickyCTA
        formId={checkoutFormId}
        totalAmount={totalAmount}
        itemsCount={itemsCount}
        disabled={disabled}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

type CartStickyCTAProps = {
  formId: string
  totalAmount: number
  itemsCount: number
  disabled: boolean
  isSubmitting: boolean
}

function CartStickyCTA({ formId, totalAmount, itemsCount, disabled, isSubmitting }: CartStickyCTAProps) {
  if (itemsCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 lg:hidden">
      <div className="mx-auto max-w-3xl rounded-3xl border border-gray-900 bg-gray-950/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Товаров: {itemsCount}</span>
          <span className="text-lg font-semibold text-white">{totalAmount.toLocaleString('ru-RU')} ₽</span>
        </div>
        <Button
          form={formId}
          type="submit"
          disabled={disabled}
          className="mt-3 w-full bg-yellow-400 text-black hover:bg-yellow-300"
        >
          {isSubmitting ? 'Отправляем...' : 'Оформить заказ'}
        </Button>
      </div>
    </div>
  )
}

