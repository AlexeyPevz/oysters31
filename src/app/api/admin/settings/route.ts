import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getSettings, updateSettings, type SiteSettings } from "@/lib/services/settings"

export async function GET() {
  try {
    await requireSession(UserRole.ADMIN)
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Failed to fetch settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

const updateSettingsSchema = z.object({
  siteName: z.string().optional(),
  siteDescription: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
  socialLinks: z.object({
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    vk: z.string().optional(),
  }).optional(),
  heroText: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    buttonText: z.string().optional(),
  }).optional(),
  footerText: z.object({
    copyright: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  workingHours: z.object({
    weekdays: z.string().optional(),
    weekends: z.string().optional(),
  }).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    await requireSession(UserRole.ADMIN)
    const json = await request.json()
    const parsed = updateSettingsSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const updatedSettings = await updateSettings(parsed.data as Partial<SiteSettings>)
    return NextResponse.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error("Failed to update settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
