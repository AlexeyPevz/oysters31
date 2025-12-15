import { NextRequest, NextResponse } from "next/server"
import { createSupply, getSupplies } from "@/lib/services/supply"
import { createSupplySchema } from "@/lib/validation/supply"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"

export async function GET() {
    try {
        await requireSession(UserRole.ADMIN)
        const supplies = await getSupplies(true)
        return NextResponse.json(supplies)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch supplies" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        await requireSession(UserRole.ADMIN)
        const body = await req.json()
        const result = createSupplySchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 })
        }

        const supply = await createSupply(result.data)
        return NextResponse.json(supply)
    } catch (error) {
        console.error("Create supply error:", error)
        return NextResponse.json({ error: "Failed to create supply" }, { status: 500 })
    }
}
