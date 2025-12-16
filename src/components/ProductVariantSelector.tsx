"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export type ProductVariant = {
    id: string
    name: string
    size: string | null
    price: number
    stock: number
    isAvailable: boolean
}

type ProductVariantSelectorProps = {
    variants: ProductVariant[]
    onSelect: (variant: ProductVariant) => void
    selectedVariantId?: string
}

export function ProductVariantSelector({
    variants,
    onSelect,
    selectedVariantId,
}: ProductVariantSelectorProps) {
    const [selected, setSelected] = useState<string | undefined>(selectedVariantId)

    const handleSelect = (variant: ProductVariant) => {
        setSelected(variant.id)
        onSelect(variant)
    }

    // Sort variants by display order or name
    const sortedVariants = [...variants].sort((a, b) => {
        // Extract numbers from names like "№1", "№2"
        const numA = parseInt(a.name.replace(/\D/g, "")) || 0
        const numB = parseInt(b.name.replace(/\D/g, "")) || 0
        return numA - numB
    })

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-gray-300">Выберите размер:</p>
            <div className="grid grid-cols-1 gap-2">
                {sortedVariants.map((variant) => {
                    const isSelected = selected === variant.id
                    const isAvailable = variant.isAvailable && variant.stock > 0

                    return (
                        <button
                            key={variant.id}
                            onClick={() => isAvailable && handleSelect(variant)}
                            disabled={!isAvailable}
                            className={`
                relative flex items-center justify-between p-3 rounded-lg border-2 transition-all
                ${isSelected
                                    ? "border-yellow-400 bg-yellow-400/10"
                                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                                }
                ${!isAvailable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
                        >
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">{variant.name}</span>
                                    {variant.size && (
                                        <span className="text-sm text-gray-400">({variant.size})</span>
                                    )}
                                </div>
                                {!isAvailable && (
                                    <span className="text-xs text-red-400">Нет в наличии</span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-yellow-400">
                                    {variant.price.toLocaleString("ru-RU")} ₽
                                </span>
                                {isSelected && (
                                    <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-black" />
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
