"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Неверные данные" }))
        throw new Error(error.error)
      }
      const data = await response.json()
      toast({ title: "Добро пожаловать", description: "Успешный вход" })
      router.push(searchParams.get("redirect") || data.redirectTo || "/profile")
      router.refresh()
    } catch (error: any) {
      toast({ title: "Ошибка авторизации", description: error.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Вход</h1>
            <p className="text-gray-400">Используйте email или телефон и пароль, выданный администратором.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
            <div>
              <Label htmlFor="identifier">Email или телефон</Label>
              <Input
                id="identifier"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="bg-gray-900 border-gray-800"
                placeholder="pevzner.alexey@yandex.ru"
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-gray-900 border-gray-800"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
              {isSubmitting ? "Входим…" : "Войти"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
