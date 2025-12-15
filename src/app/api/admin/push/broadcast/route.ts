import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { broadcastPushNotification } from "@/lib/services/push"

const payloadSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(3),
  url: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  await requireSession(UserRole.ADMIN)
  const json = await request.json()
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await broadcastPushNotification(parsed.data)
    return NextResponse.json({ delivered: result.total })
  } catch (error) {
    const message = error instanceof Error ? error.message : "WEB_PUSH_NOT_CONFIGURED"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}

