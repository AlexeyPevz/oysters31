import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSession } from "@/lib/auth/session"
import { UserRole } from "@prisma/client"
import { z } from "zod"

const variantSchema = z.object({
    name: z.string().min(1, "Название обязательно"),
    size: z.string().optional().nullable(),
    price: z.number().positive("Цена должна быть положительной"),
    stock: z.number().int().min(0, "Остаток не может быть отрицательным"),
    status: z.enum(["AVAILABLE", "PREORDER", "SOON", "HIDDEN"]),
    isAvailable: z.boolean(),
    displayOrder: z.number().int().min(0).optional(),
})

// PUT /api/admin/products/[id]/variants/[variantId] - Update variant
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; variantId: string } }
) {
    try {
        await requireSession(UserRole.ADMIN)

        const body = await request.json()
        const data = variantSchema.parse(body)

        const variant = await db.productVariant.update({
            where: {
                id: params.variantId,
                productId: params.id, // Ensure variant belongs to this product
            },
            data,
        })

        return NextResponse.json(variant)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            )
        }
        console.error("Error updating variant:", error)
        return NextResponse.json(
            { error: "Failed to update variant" },
            { status: 500 }
        )
    }
}

// DELETE /api/admin/products/[id]/variants/[variantId] - Delete variant
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; variantId: string } }
) {
    try {
        await requireSession(UserRole.ADMIN)

        await db.productVariant.delete({
            where: {
                id: params.variantId,
                productId: params.id, // Ensure variant belongs to this product
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting variant:", error)
        return NextResponse.json(
            { error: "Failed to delete variant" },
            { status: 500 }
        )
    }
}
