import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"

export async function GET() {
  try {
    await requireSession(UserRole.ADMIN)
    
    const integrations = await db.setting.findMany({
      where: {
        key: {
          startsWith: "vapid"
        }
      }
    })
    
    const integrationsMap = integrations.reduce((acc, integration) => {
      acc[integration.key] = integration.value
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json(integrationsMap)
  } catch (error) {
    console.error("Failed to fetch integrations:", error)
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    )
  }
}

const updateIntegrationsSchema = z.record(z.string(), z.any())

export async function PATCH(request: NextRequest) {
  try {
    await requireSession(UserRole.ADMIN)
    const json = await request.json()
    const parsed = updateIntegrationsSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const updatePromises = Object.entries(parsed.data).map(([key, value]) => {
      return db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    })
    
    await Promise.all(updatePromises)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update integrations:", error)
    return NextResponse.json(
      { error: "Failed to update integrations" },
      { status: 500 }
    )
  }
}
