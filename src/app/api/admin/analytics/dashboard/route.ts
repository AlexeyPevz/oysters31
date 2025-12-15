import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth/session"
import { UserRole } from "@prisma/client"
import { getDashboardMetrics } from "@/lib/services/analytics"

export async function GET() {
    try {
        await requireSession(UserRole.ADMIN)
    } catch (authError) {
        console.error("Auth error:", authError)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const metrics = await getDashboardMetrics()
        return NextResponse.json(metrics)
    } catch (error) {
        console.error("Failed to get dashboard metrics:", error)
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack")
        return NextResponse.json({
            error: "Failed to fetch metrics",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
