"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Eye, EyeOff, Mail, Smartphone, Bell, CreditCard, Loader2 } from "lucide-react"

interface IntegrationField {
  key: string
  label: string
  description: string
  type: "text" | "password"
  placeholder?: string
  icon?: React.ReactNode
}

const integrationFields: Record<string, IntegrationField[]> = {
  push: [
    {
      key: "vapidPublicKey",
      label: "VAPID Public Key",
      description: "Публичный ключ для Web Push уведомлений",
      type: "text",
      icon: <Bell className="h-4 w-4" />
    },
    {
      key: "vapidPrivateKey",
      label: "VAPID Private Key",
      description: "Приватный ключ для Web Push уведомлений",
      type: "password",
      icon: <Bell className="h-4 w-4" />
    },
    {
      key: "vapidEmail",
      label: "VAPID Email",
      description: "Email для VAPID",
      type: "email",
      icon: <Mail className="h-4 w-4" />
    }
  ],
  sms: [
    {
      key: "smsProvider",
      label: "SMS провайдер",
      description: "Провайдер SMS-сервисов (например, sms.ru, twilio)",
      type: "text",
      placeholder: "sms.ru"
    },
    {
      key: "smsApiKey",
      label: "API ключ SMS",
      description: "API ключ для SMS-сервиса",
      type: "password",
      icon: <Smartphone className="h-4 w-4" />
    }
  ],
  email: [
    {
      key: "emailProvider",
      label: "Email провайдер",
      description: "Провайдер email-сервисов (например, resend, sendgrid)",
      type: "text",
      placeholder: "resend"
    },
    {
      key: "emailApiKey",
      label: "API ключ Email",
      description: "API ключ для email-сервиса",
      type: "password",
      icon: <Mail className="h-4 w-4" />
    },
    {
      key: "emailFrom",
      label: "Email отправителя",
      description: "Email адрес для отправки писем",
      type: "email",
      placeholder: "noreply@oysters.ru"
    }
  ],
  telegram: [
    {
      key: "telegramBotToken",
      label: "Telegram Bot Token",
      description: "Токен Telegram бота для уведомлений",
      type: "password",
      icon: <Smartphone className="h-4 w-4" />
    },
    {
      key: "telegramChatId",
      label: "Telegram Chat ID",
      description: "ID чата для отправки уведомлений",
      type: "text"
    }
  ],
  payment: [
    {
      key: "paymentProvider",
      label: "Платежный провайдер",
      description: "Провайдер платежей (например, stripe, yookassa)",
      type: "text",
      placeholder: "yookassa"
    },
    {
      key: "paymentApiKey",
      label: "API ключ платежей",
      description: "API ключ для платежного провайдера",
      type: "password",
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      key: "paymentSecretKey",
      label: "Секретный ключ платежей",
      description: "Секретный ключ для платежного провайдера",
      type: "password",
      icon: <CreditCard className="h-4 w-4" />
    }
  ]
}

export function IntegrationsForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<Record<string, string>>({})

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось обновить интеграции")
      }

      toast.success("Интеграции успешно обновлены")
    } catch (error) {
      console.error("Error updating integrations:", error)
      toast.error(error instanceof Error ? error.message : "Ошибка при обновлении интеграций")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: IntegrationField) => {
    const isPassword = field.type === "password"
    const isVisible = showPasswords[field.key] || !isPassword

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key} className="flex items-center gap-2">
          {field.icon}
          {field.label}
        </Label>
        <div className="relative">
          <Input
            id={field.key}
            type={isVisible ? "text" : "password"}
            value={formData[field.key] || ""}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="pr-10"
          />
          {isPassword && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => togglePasswordVisibility(field.key)}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">{field.description}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="push" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="push">Push</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="payment">Платежи</TabsTrigger>
        </TabsList>
        
        <TabsContent value="push" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Web Push уведомления
              </CardTitle>
              <CardDescription>
                Настройте VAPID ключи для отправки push-уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationFields.push.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                SMS-уведомления
              </CardTitle>
              <CardDescription>
                Настройте SMS-сервис для отправки уведомлений клиентам
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationFields.sms.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email-уведомления
              </CardTitle>
              <CardDescription>
                Настройте email-сервис для отправки уведомлений клиентам
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationFields.email.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="telegram" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Telegram-уведомления
              </CardTitle>
              <CardDescription>
                Настройте Telegram бота для отправки уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationFields.telegram.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Платежная система
              </CardTitle>
              <CardDescription>
                Настройте платежную систему для приема онлайн-платежей
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrationFields.payment.map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end mt-8">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSubmitting ? "Сохранение..." : "Сохранить"}
        </Button>
      </div>
    </form>
  )
}
