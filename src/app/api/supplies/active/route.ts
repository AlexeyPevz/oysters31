import { NextResponse } from "next/server"
import { getActiveSupply } from "@/lib/services/supply"

// Public API endpoint for homepage banner
export async function GET() {
    try {
        const supply = await getActiveSupply()
        // Возвращаем null если нет активной поставки, это нормально
        return NextResponse.json(supply || null)
    } catch (error) {
        console.error("Fetch active supply error:", error)
        return NextResponse.json({ error: "Failed to fetch active supply" }, { status: 500 })
    }
}
