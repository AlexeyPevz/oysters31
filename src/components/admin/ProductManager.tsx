"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { ProductCategory, ProductStatus, type Product } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Неизвестная ошибка")

const statusLabels: Record<ProductStatus, string> = {
  AVAILABLE: "В продаже",
  PREORDER: "Предзаказ",
  SOON: "Скоро",
  HIDDEN: "Скрыт",
}

type ProductListResponse = {
  items: Product[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

type FilterState = {
  search: string
  category: string
  status: string
  promoted: string
  page: number
}

const defaultFilters: FilterState = {
  search: "",
  category: "all",
  status: "all",
  promoted: "all",
  page: 1,
}

async function fetchProducts(filters: FilterState): Promise<ProductListResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.category !== "all") params.set("category", filters.category)
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.promoted !== "all") params.set("promoted", filters.promoted)
  params.set("page", String(filters.page))
  params.set("limit", "50")
  const response = await fetch(`/api/admin/products?${params.toString()}` , { cache: "no-store" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Не удалось загрузить товары" }))
    throw new Error(error.error ?? "Ошибка загрузки")
  }
  return response.json()
}

async function saveProduct(body: { id?: string; payload: any }) {
  const endpoint = body.id ? `/api/admin/products/${body.id}` : "/api/admin/products"
  const method = body.id ? "PUT" : "POST"
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body.payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Не удалось сохранить" }))
    if (data.errors?.fieldErrors) {
      const errorMessages = Object.entries(data.errors.fieldErrors)
        .map(([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`)
        .join("; ")
      throw new Error(errorMessages)
    }
    throw new Error(data.error ?? "Ошибка сохранения")
  }
  return response.json()
}

async function deleteProduct(id: string) {
  const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Не удалось удалить" }))
    throw new Error(error.error ?? "Ошибка удаления")
  }
  return response.json()
}

export function ProductManager({ initialData }: { initialData: ProductListResponse }) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const query = useQuery({
    queryKey: ["admin-products", filters],
    queryFn: () => fetchProducts(filters),
    initialData,
    placeholderData: keepPreviousData,
  })

  const mutation = useMutation({
    mutationFn: saveProduct,
    onSuccess: () => {
      toast.success("Товар сохранён")
      queryClient.invalidateQueries({ queryKey: ["admin-products"] })
      setDialogOpen(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Товар удалён")
      queryClient.invalidateQueries({ queryKey: ["admin-products"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const handleSort = (product: Product, step: number) => {
    mutation.mutate({ id: product.id, payload: { displayOrder: (product.displayOrder ?? 0) + step } })
  }

  return (
    <div className="space-y-6">
      <FilterPanel filters={filters} onChange={setFilters} onCreate={() => { setEditing(null); setDialogOpen(true) }} />

      <div className="rounded-2xl border border-gray-900 bg-gray-950/70 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Товар</th>
              <th className="px-4 py-3 text-left">Категория</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-right">Цена</th>
              <th className="px-4 py-3 text-center">Порядок</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {query.data.items.map((product) => (
              <tr key={product.id} className="hover:bg-gray-900/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductImage urls={product.imageUrls} name={product.name} />
                    <div>
                      <p className="text-white font-semibold leading-tight">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">{product.category}</td>
                <td className="px-4 py-3 text-gray-300">{statusLabels[product.status]}</td>
                <td className="px-4 py-3 text-right text-white font-semibold">{Number(product.price).toLocaleString("ru-RU")} ₽</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8 border-gray-800" onClick={() => handleSort(product, -1)}>
                      ↑
                    </Button>
                    <span className="text-gray-300 text-sm">{product.displayOrder ?? 0}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8 border-gray-800" onClick={() => handleSort(product, 1)}>
                      ↓
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="border-gray-800 text-gray-100" onClick={() => { setEditing(product); setDialogOpen(true) }}>
                      Изменить
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(product.id)}>
                      Удалить
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Показано {query.data.items.length} из {query.data.pagination.total}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-gray-800" disabled={filters.page === 1} onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}>
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-800"
            disabled={filters.page >= query.data.pagination.pages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Далее
          </Button>
        </div>
      </div>

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} onSubmit={(payload) => mutation.mutate(payload)} loading={mutation.isPending} />
    </div>
  )
}

type FilterProps = {
  filters: FilterState
  onChange: (updater: (prev: FilterState) => FilterState) => void
  onCreate: () => void
}

function FilterPanel({ filters, onChange, onCreate }: FilterProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div className="flex-1">
        <Label>Поиск</Label>
        <Input value={filters.search} onChange={(event) => onChange((prev) => ({ ...prev, search: event.target.value, page: 1 }))} placeholder="Название или slug" className="bg-gray-900 border-gray-800" />
      </div>
      <SelectField
        label="Категория"
        value={filters.category}
        options={[{ value: "all", label: "Все" }, ...Object.values(ProductCategory).map((value) => ({ value, label: value }))]}
        onChange={(value) => onChange((prev) => ({ ...prev, category: value, page: 1 }))}
      />
      <SelectField
        label="Статус"
        value={filters.status}
        options={[{ value: "all", label: "Все" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]}
        onChange={(value) => onChange((prev) => ({ ...prev, status: value, page: 1 }))}
      />
      <SelectField
        label="Промо"
        value={filters.promoted}
        options={[
          { value: "all", label: "Все" },
          { value: "true", label: "Выделенные" },
          { value: "false", label: "Обычные" },
        ]}
        onChange={(value) => onChange((prev) => ({ ...prev, promoted: value, page: 1 }))}
      />
      <Button className="bg-yellow-500 text-black hover:bg-yellow-400" onClick={onCreate}>
        Добавить товар
      </Button>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <div className="w-full lg:w-40">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800 text-white">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-white">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

type ProductFormState = {
  name: string
  slug: string
  category: ProductCategory
  status: ProductStatus
  price: string
  unit: string
  shortDescription: string
  fullDescription: string
  displayOrder: string
  isPromoted: boolean
  imageUrls: string
}

const emptyForm: ProductFormState = {
  name: "",
  slug: "",
  category: ProductCategory.OYSTERS,
  status: ProductStatus.AVAILABLE,
  price: "0",
  unit: "шт",
  shortDescription: "",
  fullDescription: "",
  displayOrder: "0",
  isPromoted: false,
  imageUrls: "",
}

type DialogProps = {
  open: boolean
  onOpenChange: (value: boolean) => void
  product: Product | null
  onSubmit: (body: { id?: string; payload: any }) => void
  loading: boolean
}

function ProductDialog({ open, onOpenChange, product, onSubmit, loading }: DialogProps) {
  const [form, setForm] = useState<ProductFormState>(emptyForm)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        category: product.category,
        status: product.status,
        price: String(product.price ?? 0),
        unit: product.unit,
        shortDescription: product.shortDescription ?? "",
        fullDescription: product.fullDescription ?? "",
        displayOrder: String(product.displayOrder ?? 0),
        isPromoted: Boolean(product.isPromoted),
        imageUrls: Array.isArray(product.imageUrls) ? (product.imageUrls as string[]).join("\n") : "",
      })
    } else {
      setForm(emptyForm)
    }
  }, [product])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const images = form.imageUrls
      .split(/\n|,|;/)
      .map((value) => value.trim())
      .filter(Boolean)
    onSubmit({
      id: product?.id,
      payload: {
        name: form.name,
        slug: form.slug,
        category: form.category,
        status: form.status,
        price: Number(form.price),
        unit: form.unit,
        shortDescription: form.shortDescription || null,
        fullDescription: form.fullDescription || null,
        displayOrder: Number(form.displayOrder),
        isPromoted: form.isPromoted,
        imageUrls: images,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-gray-800 bg-gray-950 text-white">
        <DialogHeader>
          <DialogTitle>{product ? "Редактировать товар" : "Новый товар"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Название</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} required className="bg-gray-900 border-gray-800" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Категория" value={form.category} options={Object.values(ProductCategory).map((value) => ({ value, label: value }))} onChange={(value) => setForm((prev) => ({ ...prev, category: value as ProductCategory }))} />
            <SelectField label="Статус" value={form.status} options={Object.values(ProductStatus).map((value) => ({ value, label: statusLabels[value] }))} onChange={(value) => setForm((prev) => ({ ...prev, status: value as ProductStatus }))} />
            <div>
              <Label>Цена</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Единица</Label>
              <Input value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <Label>Порядок</Label>
              <Input type="number" value={form.displayOrder} onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Checkbox checked={form.isPromoted} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPromoted: Boolean(checked) }))} />
              <span className="text-sm text-gray-300">Показывать в промо</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Короткое описание</Label>
              <Textarea value={form.shortDescription} onChange={(event) => setForm((prev) => ({ ...prev, shortDescription: event.target.value }))} className="bg-gray-900 border-gray-800" rows={3} />
            </div>
            <div>
              <Label>Полное описание</Label>
              <Textarea value={form.fullDescription} onChange={(event) => setForm((prev) => ({ ...prev, fullDescription: event.target.value }))} className="bg-gray-900 border-gray-800" rows={3} />
            </div>
          </div>
          <div>
            <Label>Изображения (один URL в строке)</Label>
            <Textarea value={form.imageUrls} onChange={(event) => setForm((prev) => ({ ...prev, imageUrls: event.target.value }))} className="bg-gray-900 border-gray-800" rows={3} />
            <div className="mt-2 flex gap-2">
              {form.imageUrls
                .split(/\n|,|;/)
                .map((value) => value.trim())
                .filter(Boolean)
                .slice(0, 4)
                .map((url) => (
                  <img key={url} src={url} alt="preview" className="h-16 w-16 rounded-lg object-cover border border-gray-800" />
                ))}
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
            {loading ? "Сохранение..." : product ? "Сохранить" : "Создать"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProductImage({ urls, name }: { urls: unknown; name: string }) {
  const list = Array.isArray(urls) ? (urls as unknown[]).filter((value): value is string => typeof value === "string" && value.length > 0) : []
  if (list.length === 0) {
    return <div className="size-12 rounded-xl border border-dashed border-gray-700 text-xs text-gray-500 flex items-center justify-center">нет фото</div>
  }
  return <img src={list[0]} alt={name} className="size-12 rounded-xl object-cover border border-gray-800" />
}

