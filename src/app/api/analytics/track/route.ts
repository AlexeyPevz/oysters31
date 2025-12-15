import { NextRequest, NextResponse } from "next/server"
import { trackPageView } from "@/lib/services/analytics"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { path } = body

        if (!path) {
            return NextResponse.json({ error: "Path is required" }, { status: 400 })
        }

        const userAgent = request.headers.get("user-agent") || undefined
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            undefined

        await trackPageView(path, userAgent, ip)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to track page view:", error)
        return NextResponse.json({ error: "Failed to track" }, { status: 500 })
    }
}
