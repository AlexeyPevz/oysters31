"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Calendar, Plus, Trash2, Package, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { Product } from "@prisma/client"

type SupplyItem = {
    id: string
    productId: string
    quantity: number
    reservedQty: number
    product: {
        id: string
        name: string
        price: number | { toNumber(): number } // Support both number and Prisma Decimal
    }
}

type Supply = {
    id: string
    name: string
    description: string | null
    supplyDate: Date | string
    isActive: boolean
    bannerImage: string | null
    createdAt: Date | string
    items: SupplyItem[]
    _count?: {
        waitlist: number
    }
}

async function fetchSupplies(): Promise<Supply[]> {
    const response = await fetch("/api/admin/supplies", { cache: "no-store" })
    if (!response.ok) throw new Error("Не удалось загрузить поставки")
    return response.json()
}

async function createSupply(payload: any) {
    const response = await fetch("/api/admin/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Ошибка создания поставки" }))
        throw new Error(error.error || "Ошибка создания поставки")
    }
    return response.json()
}

async function deleteSupply(id: string) {
    const response = await fetch(`/api/admin/supplies/${id}`, { method: "DELETE" })
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Ошибка удаления" }))
        throw new Error(error.error || "Ошибка удаления")
    }
    return response.json()
}

export function SupplyManager({ initialSupplies, products }: { initialSupplies: Supply[]; products: Product[] }) {
    const queryClient = useQueryClient()
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const { data: supplies = initialSupplies, isFetching } = useQuery({
        queryKey: ["admin-supplies"],
        queryFn: fetchSupplies,
        initialData: initialSupplies,
    })

    const createMutation = useMutation({
        mutationFn: createSupply,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-supplies"] })
            setIsCreateOpen(false)
            toast.success("Поставка создана")
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteSupply,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-supplies"] })
            toast.success("Поставка удалена")
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
    })

    const upcomingSupplies = supplies.filter((supply) => {
        const date = new Date(supply.supplyDate)
        return date >= new Date() && supply.isActive
    })

    const pastSupplies = supplies.filter((supply) => {
        const date = new Date(supply.supplyDate)
        return date < new Date() || !supply.isActive
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-400">Управление поставками</p>
                    <h1 className="text-4xl font-bold">Поставки товаров</h1>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-yellow-500 text-black hover:bg-yellow-400">
                            <Plus className="h-4 w-4 mr-2" />
                            Создать поставку
                        </Button>
                    </DialogTrigger>
                    <CreateSupplyDialog
                        products={products}
                        onSubmit={(data) => createMutation.mutate(data)}
                        isLoading={createMutation.isPending}
                    />
                </Dialog>
            </div>

            {isFetching && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            )}

            {upcomingSupplies.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Предстоящие поставки</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingSupplies.map((supply) => (
                            <SupplyCard key={supply.id} supply={supply} onDelete={() => deleteMutation.mutate(supply.id)} isDeleting={deleteMutation.isPending} />
                        ))}
                    </div>
                </div>
            )}

            {pastSupplies.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Прошедшие поставки</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pastSupplies.map((supply) => (
                            <SupplyCard key={supply.id} supply={supply} onDelete={() => deleteMutation.mutate(supply.id)} isDeleting={deleteMutation.isPending} isPast />
                        ))}
                    </div>
                </div>
            )}

            {supplies.length === 0 && (
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
                    Поставок пока нет. Создайте первую поставку с товарами.
                </div>
            )}
        </div>
    )
}

function SupplyCard({ supply, onDelete, isDeleting, isPast = false }: { supply: Supply; onDelete: () => void; isDeleting: boolean; isPast?: boolean }) {
    const totalItems = supply.items.reduce((sum, item) => sum + item.quantity, 0)
    const reservedItems = supply.items.reduce((sum, item) => sum + item.reservedQty, 0)

    const formattedDate = new Date(supply.supplyDate).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })

    return (
        <Card className={`bg-gray-900/60 border-gray-800 ${isPast ? "opacity-60" : ""}`}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">{supply.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                            <Calendar className="h-4 w-4" />
                            {formattedDate}
                        </CardDescription>
                    </div>
                    <Badge className={supply.isActive ? "bg-green-500/20 text-green-200" : "bg-gray-500/20 text-gray-200"}>{supply.isActive ? "Активна" : "Неактивна"}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1">
                    <p className="text-sm text-gray-400">Товаров: {supply.items.length} наименований</p>
                    <p className="text-sm text-gray-400">
                        Количество: {totalItems} шт (резерв: {reservedItems})
                    </p>
                    {supply._count && <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        В листе ожидания: {supply._count.waitlist}
                    </p>}
                </div>
                <div className="flex gap-2">
                    {supply._count && supply._count.waitlist > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/admin/supplies/${supply.id}/waitlist`, '_blank')}
                            className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
                        >
                            <Users className="h-3 w-3 mr-1" />
                            Waitlist ({supply._count.waitlist})
                        </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={onDelete} disabled={isDeleting} className="border-red-400 text-red-400 hover:bg-red-400 hover:text-black">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Удалить
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function CreateSupplyDialog({ products, onSubmit, isLoading }: { products: Product[]; onSubmit: (data: any) => void; isLoading: boolean }) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        supplyDate: "",
        bannerImage: "",
        items: [] as { productId: string; quantity: number }[],
    })

    const [selectedProduct, setSelectedProduct] = useState("")
    const [selectedQuantity, setSelectedQuantity] = useState("")

    const handleAddItem = () => {
        if (!selectedProduct || !selectedQuantity) {
            toast.error("Выберите товар и укажите количество")
            return
        }
        const quantity = Number(selectedQuantity)
        if (quantity <= 0) {
            toast.error("Количество должно быть больше 0")
            return
        }
        // Проверяем, не добавлен ли уже этот товар
        if (formData.items.some((item) => item.productId === selectedProduct)) {
            toast.error("Этот товар уже добавлен")
            return
        }
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { productId: selectedProduct, quantity }],
        }))
        setSelectedProduct("")
        setSelectedQuantity("")
    }

    const handleRemoveItem = (productId: string) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.productId !== productId),
        }))
    }

    const handleSubmit = () => {
        if (!formData.name || !formData.supplyDate) {
            toast.error("Заполните название и дату")
            return
        }
        if (formData.items.length === 0) {
            toast.error("Добавьте хотя бы один товар")
            return
        }
        onSubmit({
            ...formData,
            isActive: true,
        })
    }

    return (
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Создать поставку</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <div>
                    <Label>Название поставки</Label>
                    <Input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="bg-gray-800 border-gray-700" placeholder="Поставка морских деликатесов" />
                </div>
                <div>
                    <Label>Описание (опционально)</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} className="bg-gray-800 border-gray-700" placeholder="Краткое описание поставки" />
                </div>
                <div>
                    <Label>Дата и время поступления</Label>
                    <Input type="datetime-local" value={formData.supplyDate} onChange={(e) => setFormData((prev) => ({ ...prev, supplyDate: e.target.value }))} className="bg-gray-800 border-gray-700" />
                </div>
                <div>
                    <Label>URL баннера (опционально)</Label>
                    <Input value={formData.bannerImage} onChange={(e) => setFormData((prev) => ({ ...prev, bannerImage: e.target.value }))} className="bg-gray-800 border-gray-700" placeholder="https://example.com/banner.jpg" />
                </div>

                <div className="border-t border-gray-800 pt-4">
                    <Label className="text-lg">Товары в поставке</Label>
                    <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white">
                                <option value="">Выберите товар</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                            <Input type="number" value={selectedQuantity} onChange={(e) => setSelectedQuantity(e.target.value)} className="w-24 bg-gray-800 border-gray-700" placeholder="Кол-во" />
                            <Button type="button" onClick={handleAddItem} className="bg-yellow-500 text-black hover:bg-yellow-400">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {formData.items.length > 0 && (
                            <div className="space-y-2 mt-4">
                                {formData.items.map((item) => {
                                    const product = products.find((p) => p.id === item.productId)
                                    return (
                                        <div key={item.productId} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                                            <span className="text-sm">
                                                {product?.name} - {item.quantity} шт
                                            </span>
                                            <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.productId)} className="text-red-400 hover:text-red-300">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <Button onClick={handleSubmit} disabled={isLoading} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать поставку"}
                </Button>
            </div>
        </DialogContent>
    )
}
