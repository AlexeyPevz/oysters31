import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { createSession } from "@/lib/auth/session"
import { verifyPassword } from "@/lib/auth/password"
import { UserRole } from "@prisma/client"
import { rateLimit, rateLimitConfigs } from "@/lib/middleware/rate-limit"

const payloadSchema = z.object({
  identifier: z.string(),
  password: z.string().min(6),
})

function roleRedirect(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "COURIER":
      return "/courier"
    case "STAFF":
      return "/ops"
    default:
      return "/profile"
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting для аутентификации
  const limitResult = await rateLimit(request, rateLimitConfigs.auth)
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Попробуйте через 15 минут." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimitConfigs.auth.maxRequests),
          "X-RateLimit-Remaining": String(limitResult.remaining),
          "X-RateLimit-Reset": new Date(limitResult.resetAt).toISOString(),
        },
      }
    )
  }

  const body = await request.json()
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const { identifier, password } = parsed.data
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { phone: identifier },
      ],
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 })
  }

  await createSession({ userId: user.id, role: user.role })
  return NextResponse.json({
    success: true,
    role: user.role,
    redirectTo: roleRedirect(user.role),
  }, {
    headers: {
      "X-RateLimit-Limit": String(rateLimitConfigs.auth.maxRequests),
      "X-RateLimit-Remaining": String(limitResult.remaining),
    },
  })
}
