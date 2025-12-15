import { NextResponse } from "next/server"
import { loadNotificationSettings } from "@/lib/services/notification-config"

export async function GET() {
  const config = await loadNotificationSettings()
  return NextResponse.json({
    webPushPublicKey: config.push?.publicKey ?? null,
  })
}
