"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SiteSettings } from "@/lib/services/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Save, RotateCcw, Loader2 } from "lucide-react"

interface SettingsFormProps {
  initialData: SiteSettings
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [formData, setFormData] = useState<Partial<SiteSettings>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string | object) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof SiteSettings] as object || {}),
        [field]: value
      }
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = "Некорректный email адрес"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Пожалуйста, исправьте ошибки в форме")
      return
    }
    
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось сохранить настройки")
      }

      toast.success("Настройки успешно сохранены")
      router.refresh()
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error(error instanceof Error ? error.message : "Произошла ошибка при сохранении настроек")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)

    try {
      const response = await fetch("/api/admin/settings/reset", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Не удалось сбросить настройки")
      }

      setFormData(data.settings)
      setShowResetDialog(false)
      toast.success("Настройки успешно сброшены к значениям по умолчанию")
      router.refresh()
    } catch (error) {
      console.error("Error resetting settings:", error)
      toast.error(error instanceof Error ? error.message : "Произошла ошибка при сбросе настроек")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Общие</TabsTrigger>
          <TabsTrigger value="contacts">Контакты</TabsTrigger>
          <TabsTrigger value="content">Контент</TabsTrigger>
          <TabsTrigger value="schedule">График</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>
                Основная информация о сайте
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Название сайта</Label>
                <Input
                  id="siteName"
                  value={formData.siteName || ""}
                  onChange={(e) => handleInputChange("siteName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Описание сайта</Label>
                <Textarea
                  id="siteDescription"
                  value={formData.siteDescription || ""}
                  onChange={(e) => handleInputChange("siteDescription", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Контактная информация</CardTitle>
              <CardDescription>
                Как с вами связаться
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Телефон</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone || ""}
                  onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail || ""}
                  onChange={(e) => {
                    handleInputChange("contactEmail", e.target.value)
                    if (errors.contactEmail) {
                      setErrors(prev => ({ ...prev, contactEmail: "" }))
                    }
                  }}
                  className={errors.contactEmail ? "border-red-500" : ""}
                  aria-invalid={!!errors.contactEmail}
                  aria-describedby={errors.contactEmail ? "contactEmail-error" : undefined}
                />
                {errors.contactEmail && (
                  <p id="contactEmail-error" className="text-sm text-red-500">
                    {errors.contactEmail}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Адрес</Label>
                <Textarea
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Социальные сети</CardTitle>
              <CardDescription>
                Ссылки на социальные сети
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram</Label>
                <Input
                  id="telegram"
                  value={formData.socialLinks?.telegram || ""}
                  onChange={(e) => handleNestedInputChange("socialLinks", "telegram", e.target.value)}
                  placeholder="https://t.me/yourchannel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.socialLinks?.whatsapp || ""}
                  onChange={(e) => handleNestedInputChange("socialLinks", "whatsapp", e.target.value)}
                  placeholder="https://wa.me/yourphone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.socialLinks?.instagram || ""}
                  onChange={(e) => handleNestedInputChange("socialLinks", "instagram", e.target.value)}
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vk">ВКонтакте</Label>
                <Input
                  id="vk"
                  value={formData.socialLinks?.vk || ""}
                  onChange={(e) => handleNestedInputChange("socialLinks", "vk", e.target.value)}
                  placeholder="https://vk.com/yourpage"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Главный экран</CardTitle>
              <CardDescription>
                Тексты на главном экране сайта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">Заголовок</Label>
                <Input
                  id="heroTitle"
                  value={formData.heroText?.title || ""}
                  onChange={(e) => handleNestedInputChange("heroText", "title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Подзаголовок</Label>
                <Textarea
                  id="heroSubtitle"
                  value={formData.heroText?.subtitle || ""}
                  onChange={(e) => handleNestedInputChange("heroText", "subtitle", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroButtonText">Текст кнопки</Label>
                <Input
                  id="heroButtonText"
                  value={formData.heroText?.buttonText || ""}
                  onChange={(e) => handleNestedInputChange("heroText", "buttonText", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Подвал сайта</CardTitle>
              <CardDescription>
                Тексты в подвале сайта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footerCopyright">Копирайт</Label>
                <Input
                  id="footerCopyright"
                  value={formData.footerText?.copyright || ""}
                  onChange={(e) => handleNestedInputChange("footerText", "copyright", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerDescription">Описание</Label>
                <Textarea
                  id="footerDescription"
                  value={formData.footerText?.description || ""}
                  onChange={(e) => handleNestedInputChange("footerText", "description", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Время работы</CardTitle>
              <CardDescription>
                Укажите время работы вашего заведения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weekdays">Будни</Label>
                <Input
                  id="weekdays"
                  value={formData.workingHours?.weekdays || ""}
                  onChange={(e) => handleNestedInputChange("workingHours", "weekdays", e.target.value)}
                  placeholder="10:00 - 22:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekends">Выходные</Label>
                <Input
                  id="weekends"
                  value={formData.workingHours?.weekends || ""}
                  onChange={(e) => handleNestedInputChange("workingHours", "weekends", e.target.value)}
                  placeholder="11:00 - 21:00"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowResetDialog(true)}
          disabled={isResetting || isSubmitting}
          className="flex items-center gap-2"
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Сбросить
        </Button>
        
        <Button
          type="submit"
          disabled={isSubmitting || isResetting}
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

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сброс настроек</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите сбросить все настройки к значениям по умолчанию? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700"
            >
              Сбросить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
