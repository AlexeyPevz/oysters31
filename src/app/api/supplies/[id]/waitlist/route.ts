import { NextRequest, NextResponse } from "next/server"
import { addToWaitlist } from "@/lib/services/supply"
import { addToWaitlistSchema } from "@/lib/validation/supply"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await req.json()
        const result = addToWaitlistSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 })
        }

        const waitlistEntry = await addToWaitlist(params.id, result.data)
        return NextResponse.json(waitlistEntry)
    } catch (error) {
        console.error("Add to waitlist error:", error)
        const message = error instanceof Error ? error.message : "Failed to add to waitlist"

        // Если ошибка "Недостаточно товара", возвращаем 409 Conflict
        if (message.includes("Недостаточно товара")) {
            return NextResponse.json({ error: message }, { status: 409 })
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
