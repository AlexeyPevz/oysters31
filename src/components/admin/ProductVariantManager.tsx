"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ProductVariant = {
    id: string
    name: string
    size: string | null
    price: number
    stock: number
    status: string
    isAvailable: boolean
    displayOrder: number
}

type VariantFormData = {
    name: string
    size: string
    price: string
    stock: string
    status: string
    isAvailable: boolean
    displayOrder: string
}

const statusOptions = [
    { value: "AVAILABLE", label: "В наличии", color: "bg-green-500" },
    { value: "PREORDER", label: "Предзаказ", color: "bg-blue-500" },
    { value: "SOON", label: "Скоро", color: "bg-yellow-500" },
    { value: "HIDDEN", label: "Скрыто", color: "bg-gray-500" },
]

export function ProductVariantManager({ productId }: { productId: string }) {
    const [variants, setVariants] = useState<ProductVariant[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
    const { toast } = useToast()

    const [formData, setFormData] = useState<VariantFormData>({
        name: "",
        size: "",
        price: "",
        stock: "0",
        status: "AVAILABLE",
        isAvailable: true,
        displayOrder: "0",
    })

    useEffect(() => {
        loadVariants()
    }, [productId])

    const loadVariants = async () => {
        try {
            const res = await fetch(`/api/admin/products/${productId}/variants`)
            if (res.ok) {
                const data = await res.json()
                setVariants(data)
            }
        } catch (error) {
            toast({ title: "Ошибка", description: "Не удалось загрузить варианты", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const data = {
            name: formData.name,
            size: formData.size || null,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock),
            status: formData.status,
            isAvailable: formData.isAvailable,
            displayOrder: parseInt(formData.displayOrder),
        }

        try {
            const url = editingVariant
                ? `/api/admin/products/${productId}/variants/${editingVariant.id}`
                : `/api/admin/products/${productId}/variants`

            const res = await fetch(url, {
                method: editingVariant ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                toast({
                    title: "Успешно",
                    description: editingVariant ? "Вариант обновлен" : "Вариант создан",
                })
                setIsDialogOpen(false)
                resetForm()
                loadVariants()
            } else {
                const error = await res.json()
                toast({
                    title: "Ошибка",
                    description: error.error || "Не удалось сохранить вариант",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({ title: "Ошибка", description: "Произошла ошибка", variant: "destructive" })
        }
    }

    const handleDelete = async (variantId: string) => {
        if (!confirm("Удалить этот вариант?")) return

        try {
            const res = await fetch(`/api/admin/products/${productId}/variants/${variantId}`, {
                method: "DELETE",
            })

            if (res.ok) {
                toast({ title: "Успешно", description: "Вариант удален" })
                loadVariants()
            } else {
                toast({ title: "Ошибка", description: "Не удалось удалить вариант", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Ошибка", description: "Произошла ошибка", variant: "destructive" })
        }
    }

    const handleEdit = (variant: ProductVariant) => {
        setEditingVariant(variant)
        setFormData({
            name: variant.name,
            size: variant.size || "",
            price: variant.price.toString(),
            stock: variant.stock.toString(),
            status: variant.status,
            isAvailable: variant.isAvailable,
            displayOrder: variant.displayOrder.toString(),
        })
        setIsDialogOpen(true)
    }

    const resetForm = () => {
        setEditingVariant(null)
        setFormData({
            name: "",
            size: "",
            price: "",
            stock: "0",
            status: "AVAILABLE",
            isAvailable: true,
            displayOrder: "0",
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
            </div>
        )
    }

    return (
        <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Варианты товара</CardTitle>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => resetForm()}
                                className="bg-yellow-500 text-black hover:bg-yellow-400"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Добавить вариант
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800 text-white">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingVariant ? "Редактировать вариант" : "Новый вариант"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Название *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="№1, №2, №3..."
                                        required
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="size">Размер</Label>
                                    <Input
                                        id="size"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                        placeholder="50-60г, 60-70г..."
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="price">Цена * (₽)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            required
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="stock">Остаток *</Label>
                                        <Input
                                            id="stock"
                                            type="number"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                            required
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="status">Статус *</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    >
                                        <SelectTrigger className="bg-gray-800 border-gray-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700">
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="displayOrder">Порядок отображения</Label>
                                    <Input
                                        id="displayOrder"
                                        type="number"
                                        value={formData.displayOrder}
                                        onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isAvailable"
                                        checked={formData.isAvailable}
                                        onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <Label htmlFor="isAvailable">Доступен для заказа</Label>
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400">
                                        {editingVariant ? "Сохранить" : "Создать"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        className="flex-1"
                                    >
                                        Отмена
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {variants.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                        Нет вариантов. Добавьте первый вариант товара.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {variants.map((variant) => (
                            <div
                                key={variant.id}
                                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-white">{variant.name}</span>
                                        {variant.size && (
                                            <span className="text-sm text-gray-400">({variant.size})</span>
                                        )}
                                        <Badge
                                            className={`text-xs ${statusOptions.find((s) => s.value === variant.status)?.color
                                                }/20`}
                                        >
                                            {statusOptions.find((s) => s.value === variant.status)?.label}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <span>{variant.price.toLocaleString("ru-RU")} ₽</span>
                                        <span>Остаток: {variant.stock}</span>
                                        <span>Порядок: {variant.displayOrder}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(variant)}
                                        className="border-gray-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(variant.id)}
                                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
