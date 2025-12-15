import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { resetSettings } from "@/lib/services/settings"

export async function POST() {
  try {
    await requireSession(UserRole.ADMIN)
    const settings = await resetSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("Failed to reset settings:", error)
    return NextResponse.json(
      { error: "Failed to reset settings" },
      { status: 500 }
    )
  }
}
