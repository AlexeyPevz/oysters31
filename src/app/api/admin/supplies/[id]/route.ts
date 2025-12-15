import { NextRequest, NextResponse } from "next/server"
import { deleteSupply, getSupplyById } from "@/lib/services/supply"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireSession(UserRole.ADMIN)
        const supply = await getSupplyById(params.id)
        if (!supply) {
            return NextResponse.json({ error: "Supply not found" }, { status: 404 })
        }

        return NextResponse.json(supply)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch supply" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireSession(UserRole.ADMIN)

        await deleteSupply(params.id)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete supply" }, { status: 500 })
    }
}
