import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getOpsDashboardData } from "@/lib/services/operations"

const allowedRoles = [UserRole.ADMIN, UserRole.STAFF]

export async function GET() {
  await requireSession(allowedRoles)
  const data = await getOpsDashboardData()
  return NextResponse.json(data)
}
