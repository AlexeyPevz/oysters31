"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, Loader2 } from "lucide-react"

interface ResetPasswordFormProps {
  userId: string
  userName: string
}

export function ResetPasswordForm({ userId, userName }: ResetPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.password) {
      newErrors.password = "Пароль обязателен"
    } else if (formData.password.length < 6) {
      newErrors.password = "Пароль должен содержать минимум 6 символов"
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors) {
          const fieldErrors: Record<string, string> = {}
          Object.entries(data.errors).forEach(([key, value]: [string, any]) => {
            if (Array.isArray(value) && value.length > 0) {
              fieldErrors[key] = value[0]
            }
          })
          setErrors(fieldErrors)
        } else {
          setErrors({ general: data.error || "Произошла ошибка при сбросе пароля" })
        }
        return
      }

      // Сбрасываем форму
      setFormData({
        password: "",
        confirmPassword: "",
      })
      
      toast.success(`Пароль для пользователя ${userName} успешно изменен`)
    } catch (error) {
      console.error("Error resetting password:", error)
      setErrors({ general: "Произошла ошибка при сбросе пароля" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let password = ""
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Сброс пароля
        </CardTitle>
        <CardDescription>
          Установите новый пароль для пользователя {userName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg">
              {errors.general}
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Новый пароль</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePassword}
                className="flex items-center gap-1"
              >
                <Key className="h-3 w-3" />
                Сгенерировать
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              {isSubmitting ? "Сохранение..." : "Сменить пароль"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
