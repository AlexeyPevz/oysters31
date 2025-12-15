import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { listPushSubscriptions } from "@/lib/services/push"

export async function GET() {
  await requireSession(UserRole.ADMIN)
  const stats = await listPushSubscriptions()
  return NextResponse.json(stats)
}
