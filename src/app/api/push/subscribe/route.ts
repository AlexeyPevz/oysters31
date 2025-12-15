import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { savePushSubscription } from "@/lib/services/push"
import { getSession } from "@/lib/auth/session"

const payloadSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

export async function POST(request: NextRequest) {
  const json = await request.json()
  const parsed = payloadSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const session = await getSession()
  await savePushSubscription(parsed.data.endpoint, parsed.data.keys, session?.userId)

  return NextResponse.json({ success: true })
}
