import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { isProd, serverEnv } from "@/lib/env"

const SESSION_COOKIE = "oysters_session"
const SESSION_MAX_DAYS = 14
const secret = new TextEncoder().encode(serverEnv.NEXTAUTH_SECRET)

export const sessionSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole),
  issuedAt: z.number(),
  expiresAt: z.number(),
})

export type SessionPayload = z.infer<typeof sessionSchema>

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export async function createSession({
  userId,
  role,
  expiresInDays = SESSION_MAX_DAYS,
}: {
  userId: string
  role: UserRole
  expiresInDays?: number
}) {
  const now = Date.now()
  const expiresAt = now + expiresInDays * 24 * 60 * 60 * 1000

  const token = await new SignJWT({ userId, role, issuedAt: now, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${expiresInDays}d`)
    .sign(secret)

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  })

  return token
}

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret)
    const parsed = sessionSchema.safeParse({
      userId: payload.userId,
      role: payload.role,
      issuedAt: payload.issuedAt ?? payload.iat,
      expiresAt: payload.expiresAt ?? payload.exp,
    })

    if (!parsed.success) {
      return null
    }

    if (parsed.data.expiresAt < Date.now()) {
      await deleteSession()
      return null
    }

    return parsed.data
  } catch (error) {
    await deleteSession()
    return null
  }
}

export async function deleteSession() {
  cookies().delete(SESSION_COOKIE)
}

export async function requireSession(requiredRoles?: UserRole | UserRole[]) {
  const session = await getSession()
  if (!session) {
    throw new UnauthorizedError()
  }

  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
    if (!roles.includes(session.role)) {
      throw new UnauthorizedError("Недостаточно прав")
    }
  }

  return session
}

export async function verifySessionToken(token?: string) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const parsed = sessionSchema.safeParse({
      userId: payload.userId,
      role: payload.role,
      issuedAt: payload.issuedAt ?? payload.iat,
      expiresAt: payload.expiresAt ?? payload.exp,
    })
    if (!parsed.success || parsed.data.expiresAt < Date.now()) {
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}
