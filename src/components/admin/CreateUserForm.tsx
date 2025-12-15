"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserRole } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Key, Loader2 } from "lucide-react"

export function CreateUserForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: UserRole.CLIENT,
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
    
    if (!formData.name.trim()) {
      newErrors.name = "Имя обязательно"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Имя должно содержать минимум 2 символа"
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Телефон обязателен"
    } else if (formData.phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Телефон должен содержать минимум 10 цифр"
    }
    
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Некорректный email"
    }
    
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
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          role: formData.role,
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
          setErrors({ general: data.error || "Произошла ошибка при создании пользователя" })
        }
        return
      }

      // Сбрасываем форму
      setFormData({
        name: "",
        phone: "",
        email: "",
        role: UserRole.CLIENT,
        password: "",
        confirmPassword: "",
      })
      
      toast.success("Пользователь успешно создан")
      router.refresh()
    } catch (error) {
      console.error("Error creating user:", error)
      setErrors({ general: "Произошла ошибка при создании пользователя" })
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
          <UserPlus className="h-5 w-5" />
          Создание пользователя
        </CardTitle>
        <CardDescription>
          Добавьте нового пользователя в систему
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg">
              {errors.general}
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email (необязательно)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange("role", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.CLIENT}>Клиент</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Администратор</SelectItem>
                  <SelectItem value={UserRole.COURIER}>Курьер</SelectItem>
                  <SelectItem value={UserRole.STAFF}>Сотрудник</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Пароль</Label>
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
                <UserPlus className="h-4 w-4" />
              )}
              {isSubmitting ? "Создание..." : "Создать пользователя"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
