"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calendar, Plus, Trash2, Package, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@prisma/client"

type Drop = {
  id: string
  productId: string
  dropDate: Date | string
  quantity: number | null
  isActive: boolean
  createdAt: Date | string
  product: {
    id: string
    name: string
    slug: string
  }
}

async function fetchDrops(): Promise<Drop[]> {
  const response = await fetch("/api/admin/drops", { cache: "no-store" })
  if (!response.ok) throw new Error("Не удалось загрузить дропы")
  return response.json()
}

async function createDrop(payload: { productId: string; dropDate: string; quantity?: number }) {
  const response = await fetch("/api/admin/drops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка создания дропа" }))
    throw new Error(error.error || "Ошибка создания дропа")
  }
  return response.json()
}

async function deleteDrop(id: string) {
  const response = await fetch(`/api/admin/drops/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка удаления" }))
    throw new Error(error.error || "Ошибка удаления")
  }
  return response.json()
}

async function processWaitlist(dropId: string) {
  const response = await fetch(`/api/admin/drops/${dropId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "processWaitlist" }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка обработки" }))
    throw new Error(error.error || "Ошибка обработки waitlist")
  }
  return response.json()
}

export function DropManager({ initialDrops, products }: { initialDrops: Drop[]; products: Product[] }) {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    productId: "",
    dropDate: "",
    quantity: "",
  })

  const { data: drops = initialDrops, isFetching } = useQuery({
    queryKey: ["admin-drops"],
    queryFn: fetchDrops,
    initialData: initialDrops,
  })

  const createMutation = useMutation({
    mutationFn: createDrop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drops"] })
      setIsCreateOpen(false)
      setFormData({ productId: "", dropDate: "", quantity: "" })
      toast.success("Дроп создан")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDrop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drops"] })
      toast.success("Дроп удален")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
  })

  const processMutation = useMutation({
    mutationFn: processWaitlist,
    onSuccess: (data) => {
      toast.success(`Создано заказов: ${data.created}`)
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
  })

  const handleCreate = () => {
    if (!formData.productId || !formData.dropDate) {
      toast.error("Заполните все поля")
      return
    }
    createMutation.mutate({
      productId: formData.productId,
      dropDate: formData.dropDate,
      quantity: formData.quantity ? Number(formData.quantity) : undefined,
    })
  }

  const upcomingDrops = drops.filter((drop) => {
    const date = new Date(drop.dropDate)
    return date >= new Date() && drop.isActive
  })

  const pastDrops = drops.filter((drop) => {
    const date = new Date(drop.dropDate)
    return date < new Date() || !drop.isActive
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Управление дропами</p>
          <h1 className="text-4xl font-bold">Дропы товаров</h1>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-500 text-black hover:bg-yellow-400">
              <Plus className="h-4 w-4 mr-2" />
              Создать дроп
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Создать дроп</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Товар</Label>
                <Select value={formData.productId} onValueChange={(value) => setFormData((prev) => ({ ...prev, productId: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Выберите товар" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Дата поступления</Label>
                <Input
                  type="date"
                  value={formData.dropDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dropDate: e.target.value }))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div>
                <Label>Количество (опционально)</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="bg-gray-800 border-gray-700"
                  placeholder="Оставьте пустым для неограниченного"
                />
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isFetching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {upcomingDrops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Предстоящие дропы</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingDrops.map((drop) => (
              <Card key={drop.id} className="bg-gray-900/60 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{drop.product.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(drop.dropDate).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    <Badge className={drop.isActive ? "bg-green-500/20 text-green-200" : "bg-gray-500/20 text-gray-200"}>
                      {drop.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {drop.quantity && <p className="text-sm text-gray-400">Количество: {drop.quantity}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processMutation.mutate(drop.id)}
                      disabled={processMutation.isPending}
                      className="flex-1 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                    >
                      {processMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Package className="h-3 w-3 mr-1" />
                          Обработать waitlist
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(drop.id)}
                      disabled={deleteMutation.isPending}
                      className="border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastDrops.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Прошедшие дропы</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastDrops.map((drop) => (
              <Card key={drop.id} className="bg-gray-900/40 border-gray-800 opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{drop.product.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(drop.dropDate).toLocaleDateString("ru-RU")}
                      </CardDescription>
                    </div>
                    <Badge className="bg-gray-500/20 text-gray-200">Прошедший</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(drop.id)}
                    disabled={deleteMutation.isPending}
                    className="border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Удалить
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {drops.length === 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
          Дропов пока нет. Создайте первый дроп для товара со статусом PREORDER.
        </div>
      )}
    </div>
  )
}


