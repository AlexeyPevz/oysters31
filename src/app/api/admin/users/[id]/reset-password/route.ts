import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession(UserRole.ADMIN)
    const json = await request.json()
    const parsed = resetPasswordSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { password } = parsed.data
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await db.user.update({
      where: { id: params.id },
      data: { passwordHash },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("Failed to reset password:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
