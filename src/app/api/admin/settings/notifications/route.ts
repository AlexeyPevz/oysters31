import { NextRequest, NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { loadNotificationSettings, saveNotificationSettings } from "@/lib/services/notification-config"
import { notificationSettingsSchema } from "@/lib/validation/notification-config"

export async function GET() {
  await requireSession(UserRole.ADMIN)
  const settings = await loadNotificationSettings(true)
  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  await requireSession(UserRole.ADMIN)
  const json = await request.json()
  const parsed = notificationSettingsSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }
  const saved = await saveNotificationSettings(parsed.data)
  return NextResponse.json(saved)
}
