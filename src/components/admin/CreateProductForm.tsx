"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ProductCategory, ProductStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

const categories = Object.values(ProductCategory)
const statuses = Object.values(ProductStatus)

type FormState = {
  name: string
  slug: string
  category: ProductCategory
  price: string
  unit: string
  shortDescription: string
  fullDescription: string
  status: ProductStatus
  displayOrder: string
  isPromoted: boolean
  imageUrl: string
}

const initialState: FormState = {
  name: "",
  slug: "",
  category: ProductCategory.OYSTERS,
  price: "",
  unit: "шт",
  shortDescription: "",
  fullDescription: "",
  status: ProductStatus.AVAILABLE,
  displayOrder: "0",
  isPromoted: false,
  imageUrl: "",
}

export function CreateProductForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<FormState>(initialState)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            category: formData.category,
            price: Number(formData.price),
            unit: formData.unit,
            shortDescription: formData.shortDescription,
            fullDescription: formData.fullDescription,
            status: formData.status,
            displayOrder: Number(formData.displayOrder),
            isPromoted: formData.isPromoted,
            imageUrls: formData.imageUrl ? [formData.imageUrl] : [],
          }),
        })
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Не удалось создать товар" }))
          throw new Error(error.error)
        }
        toast({ title: "Товар создан", description: "Карточка добавлена в каталог" })
        setFormData(initialState)
        router.refresh()
      } catch (error: any) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label htmlFor="name">Название</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required className="bg-gray-900 border-gray-800" />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} required className="bg-gray-900 border-gray-800" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <div>
          <Label>Категория</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as ProductCategory }))}>
            <SelectTrigger className="bg-gray-900 border-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              {categories.map((category) => (
                <SelectItem key={category} value={category} className="text-white">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Статус</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as ProductStatus }))}>
            <SelectTrigger className="bg-gray-900 border-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              {statuses.map((status) => (
                <SelectItem key={status} value={status} className="text-white">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Цена</Label>
          <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))} required className="bg-gray-900 border-gray-800" />
        </div>
        <div>
          <Label>Единица</Label>
          <Input value={formData.unit} onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))} className="bg-gray-900 border-gray-800" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>Краткое описание</Label>
          <Textarea value={formData.shortDescription} onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))} className="bg-gray-900 border-gray-800" rows={3} />
        </div>
        <div>
          <Label>Полное описание</Label>
          <Textarea value={formData.fullDescription} onChange={(e) => setFormData((prev) => ({ ...prev, fullDescription: e.target.value }))} className="bg-gray-900 border-gray-800" rows={3} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <Label>Порядок отображения</Label>
          <Input type="number" value={formData.displayOrder} onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: e.target.value }))} className="bg-gray-900 border-gray-800" />
        </div>
        <div>
          <Label>Продвижение</Label>
          <Select value={String(formData.isPromoted)} onValueChange={(value) => setFormData((prev) => ({ ...prev, isPromoted: value === 'true' }))}>
            <SelectTrigger className="bg-gray-900 border-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              <SelectItem value="true">Показывать как акцию</SelectItem>
              <SelectItem value="false">Обычный товар</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>URL изображения</Label>
          <Input value={formData.imageUrl} onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))} className="bg-gray-900 border-gray-800" />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="bg-yellow-500 text-black hover:bg-yellow-400">
        {isPending ? 'Сохраняем…' : 'Добавить товар'}
      </Button>
    </form>
  )
}
