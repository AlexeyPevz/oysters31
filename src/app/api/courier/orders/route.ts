import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getCourierDashboardData } from "@/lib/services/operations"

export async function GET() {
  const session = await requireSession(UserRole.COURIER)
  const data = await getCourierDashboardData(session.userId)
  return NextResponse.json(data)
}
