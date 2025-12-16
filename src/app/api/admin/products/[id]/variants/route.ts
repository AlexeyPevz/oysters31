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

// GET /api/admin/products/[id]/variants - List all variants for a product
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireSession(UserRole.ADMIN)

        const variants = await db.productVariant.findMany({
            where: { productId: params.id },
            orderBy: { displayOrder: "asc" },
        })

        return NextResponse.json(variants)
    } catch (error) {
        console.error("Error fetching variants:", error)
        return NextResponse.json(
            { error: "Failed to fetch variants" },
            { status: 500 }
        )
    }
}

// POST /api/admin/products/[id]/variants - Create new variant
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireSession(UserRole.ADMIN)

        const body = await request.json()
        const data = variantSchema.parse(body)

        // Verify product exists and has hasVariants = true
        const product = await db.product.findUnique({
            where: { id: params.id },
        })

        if (!product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            )
        }

        // Enable hasVariants if not already enabled
        if (!product.hasVariants) {
            await db.product.update({
                where: { id: params.id },
                data: { hasVariants: true },
            })
        }

        const variant = await db.productVariant.create({
            data: {
                ...data,
                productId: params.id,
            },
        })

        return NextResponse.json(variant, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            )
        }
        console.error("Error creating variant:", error)
        return NextResponse.json(
            { error: "Failed to create variant" },
            { status: 500 }
        )
    }
}
