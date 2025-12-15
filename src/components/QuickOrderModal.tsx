"use client"

import { useCallback, useEffect, useId, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { QuickOrderPayload } from "@/lib/validation/order"
import { Zap, Phone, Clock, ArrowRight, Check, ShoppingBag, X } from "lucide-react"

const deliverySlots = [
  { id: "MORNING", name: "Утро (9:00-12:00)", price: 0 },
  { id: "DAY", name: "День (12:00-16:00)", price: 0 },
  { id: "EVENING", name: "Вечер (16:00-20:00)", price: 100 },
]

const DEFAULT_FORM_STATE = {
  name: "",
  phone: "",
  quantity: 1,
  deliverySlot: "DAY",
  comment: "",
}

type QuickOrderFormState = typeof DEFAULT_FORM_STATE

const createInitialFormState = (): QuickOrderFormState => ({ ...DEFAULT_FORM_STATE })

interface QuickOrderModalProps {
  isOpen: boolean
  onClose: () => void
  product?: {
    id: string
    name: string
    price: number
    unit: string
    image?: string | null
  }
}

export default function QuickOrderModal({ isOpen, onClose, product }: QuickOrderModalProps) {
  const titleId = useId()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [formData, setFormData] = useState<QuickOrderFormState>(createInitialFormState)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const resetFormState = useCallback(() => {
    setFormData(createInitialFormState())
    setAgreedToTerms(false)
  }, [])

  const handleClose = useCallback(() => {
    setIsSubmitting(false)
    setIsSuccess(false)
    setOrderNumber("")
    resetFormState()
    onClose()
  }, [onClose, resetFormState])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const hasRequiredFields = Boolean(
    product &&
    formData.name.trim().length >= 2 &&
    formData.phone.trim().length >= 6 &&
    formData.quantity >= 1
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!product || !hasRequiredFields) return
    if (!agreedToTerms) {
      toast({ title: "Нужно согласие", description: "Подтвердите обработку персональных данных", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const payload: QuickOrderPayload = {
        productId: product.id,
        quantity: formData.quantity,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        deliverySlot: formData.deliverySlot as QuickOrderPayload["deliverySlot"],
        comment: formData.comment,
      }

      const response = await fetch("/api/quick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Не удалось отправить заявку" }))
        throw new Error(error.error)
      }

      const data = await response.json()
      setOrderNumber(data.orderNumber)
      setIsSuccess(true)
      toast({ title: "Заявка отправлена", description: "Перезвоним, чтобы уточнить детали." })
      resetFormState()
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedSlot = deliverySlots.find((slot) => slot.id === formData.deliverySlot)
  const deliveryCost = selectedSlot?.price ?? 0
  const itemTotal = product ? product.price * formData.quantity : 0
  const total = itemTotal + deliveryCost

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
              <Zap className="text-black w-6 h-6" />
            </div>
            <div>
              <p id={titleId} className="text-white font-semibold">
                Заказ в 1 клик
              </p>
              <p className="text-gray-400 text-sm">Оставьте номер — мы уточним все детали</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Закрыть окно быстрого заказа"
            className="text-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-full p-1 transition"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {isSuccess ? (
            <Card className="bg-green-500/10 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400 text-center">Заявка зарегистрирована</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <p className="text-3xl font-semibold text-white">{orderNumber}</p>
                <p className="text-gray-300 text-sm">Мы уже получили запрос и готовим обратный звонок.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-green-400 text-green-400"
                  onClick={() => {
                    setIsSuccess(false)
                    resetFormState()
                  }}
                >
                  Новый заказ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-white">
                      Имя
                    </Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-white">
                      Телефон
                    </Label>
                    <Input
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="quantity" className="text-white">
                      Количество
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, quantity: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Слот доставки</Label>
                    <Select value={formData.deliverySlot} onValueChange={(slot) => setFormData((prev) => ({ ...prev, deliverySlot: slot }))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        {deliverySlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id} className="text-white">
                            {slot.name} {slot.price ? `(+${slot.price.toLocaleString("ru-RU")} ₽)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="comment" className="text-white">
                    Комментарий
                  </Label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={formData.comment}
                    onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none resize-none"
                    placeholder="Когда доставить, как позвонить курьеру"
                  />
                </div>
              </div>
              {product && (
                <Card className="bg-gray-800/40 border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-yellow-400" /> {product.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Товар</span>
                      <span>{itemTotal.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Доставка</span>
                      <span>{deliveryCost ? `${deliveryCost.toLocaleString("ru-RU")} ₽` : "Бесплатно"}</span>
                    </div>
                    <div className="flex justify-between text-white text-lg font-semibold pt-2 border-t border-gray-700">
                      <span>Итого</span>
                      <span className="text-yellow-400">{total.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="flex items-start space-x-2">
                <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(Boolean(checked))} />
                <Label htmlFor="terms" className="text-sm text-gray-300">
                  Согласен с политикой обработки персональных данных
                </Label>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || !hasRequiredFields}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
              >
                {isSubmitting ? "Отправляем…" : "Оформить заявку"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Перезвоним за 10 минут
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Без спама
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> Контроль качества
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export function QuickOrderButton({ product }: { product?: QuickOrderModalProps["product"] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
        onClick={() => setIsModalOpen(true)}
      >
        <Zap className="w-4 h-4 mr-1" /> 1 клик
      </Button>
      <QuickOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} product={product} />
    </>
  )
}
