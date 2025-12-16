"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, Mail, MapPin, Clock, MessageCircle, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SiteSettings } from "@/lib/services/settings"

interface ContactsProps {
  settings: SiteSettings
}

export default function Contacts({ settings }: ContactsProps) {
  const phoneNumber = settings?.contactPhone || "+7 (4722) 55-35-55"
  const telLink = `tel:${phoneNumber.replace(/\D/g, '')}`
  const mapLink = "https://yandex.ru/maps/-/CDfABGCA"
  const socialLinks = settings?.socialLinks || {}
  const whatsappLink = socialLinks.whatsapp || `https://wa.me/${phoneNumber.replace(/\D/g, '')}`
  const telegramLink = socialLinks.telegram || "https://t.me/oysters31"
  const email = settings?.contactEmail || "info@oysters31.ru"
  const address = settings?.address || "г. Белгород"
  const { toast } = useToast()
  const [formValues, setFormValues] = useState({ name: "", phone: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.name || !formValues.phone) {
      toast({ title: "Заполните контакты", description: "Нужно указать имя и телефон." })
      return
    }
    setIsSubmitting(true)
    const body = encodeURIComponent(`Имя: ${formValues.name}\nТелефон: ${formValues.phone}\nСообщение: ${formValues.message || "не указано"}`)
    window.location.href = `mailto:${email}?subject=Заявка с сайта&body=${body}`
    toast({ title: "Черновик письма открыт", description: "Отправьте письмо или продолжите общение в мессенджере." })
    setTimeout(() => {
      setIsSubmitting(false)
      setFormValues({ name: "", phone: "", message: "" })
    }, 300)
  }

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4" id="contacts">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
            Контакты и <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">доставка</span>
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Свяжитесь с нами любым удобным способом или оставьте заявку на обратный звонок.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Телефон</h3>
              <p className="text-2xl font-bold text-yellow-400 mb-2">{phoneNumber}</p>
              <p className="text-gray-400 mb-6">Ежедневно с 9:00 до 22:00</p>
              <Button asChild className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700">
                <a href={telLink}>Позвонить</a>
              </Button>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button asChild variant="outline" size="sm" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">
                  <a href={telegramLink} target="_blank" rel="noreferrer">
                    <Send className="w-4 h-4 mr-1" /> Telegram
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Адрес</h3>
              <p className="text-lg text-gray-300 mb-2">{address}</p>
              <p className="text-gray-400 mb-6">Режим работы: 9:00 – 22:00</p>
              <Button asChild variant="outline" className="w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">
                <a href={mapLink} target="_blank" rel="noreferrer">
                  На карте
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Email</h3>
              <p className="text-lg text-gray-300 mb-2">{email}</p>
              <p className="text-gray-400 mb-6">Для вопросов и предложений</p>
              <Button asChild variant="outline" className="w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black">
                <a href={`mailto:${email}`}>Написать</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-8">
          <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-800">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Условия доставки</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Время доставки</p>
                    <p className="text-gray-400">60–90 минут с момента заказа</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Зона доставки</p>
                    <p className="text-gray-400">Белгород и ближайшие районы</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageCircle className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Минимальный заказ</p>
                    <p className="text-gray-400">от 1500 ₽ — доставка бесплатно</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border-yellow-400/30">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Оставить заявку</h3>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <input
                  name="name"
                  type="text"
                  placeholder="Ваше имя"
                  value={formValues.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Телефон"
                  value={formValues.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
                />
                <textarea
                  name="message"
                  placeholder="Сообщение"
                  rows={3}
                  value={formValues.message}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none resize-none"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
                >
                  {isSubmitting ? "Готовим письмо…" : "Отправить заявку"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

