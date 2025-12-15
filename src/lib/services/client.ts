import { randomBytes } from "crypto"
import { UserRole } from "@prisma/client"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth/password"

export type ClientInput = {
  name: string
  phone: string
  email?: string | null
}

function generatePlaceholderPassword() {
  return randomBytes(12).toString("hex")
}

export async function recordClient(input: ClientInput) {
  const password = await hashPassword(generatePlaceholderPassword())

  const user = await db.user.upsert({
    where: { phone: input.phone },
    update: {
      name: input.name,
      email: input.email ?? undefined,
    },
    create: {
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash: password,
      role: UserRole.CLIENT,
    },
  })

  const client = await db.client.upsert({
    where: { phone: input.phone },
    update: {
      name: input.name,
      email: input.email ?? undefined,
      userId: user.id,
    },
    create: {
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      userId: user.id,
    },
  })

  return client
}
