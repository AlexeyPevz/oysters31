import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { updateUserRole } from "@/lib/services/user"

const payloadSchema = z.object({
  role: z.nativeEnum(UserRole),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  await requireSession(UserRole.ADMIN)
  const json = await request.json()
  const parsed = payloadSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const user = await updateUserRole(params.id, parsed.data.role)
  return NextResponse.json({ success: true, user })
}
