import { NextRequest, NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { processWaitlistOnDrop } from "@/lib/services/drop"

type RouteParams = {
  params: { id: string }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  await requireSession(UserRole.ADMIN)

  try {
    await db.productDrop.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка удаления дропа" },
      { status: 400 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  await requireSession(UserRole.ADMIN)
  const body = await request.json()

  try {
    const drop = await db.productDrop.update({
      where: { id: params.id },
      data: {
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.dropDate && { dropDate: new Date(body.dropDate) }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })
    return NextResponse.json(drop)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка обновления дропа" },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  await requireSession(UserRole.ADMIN)
  const body = await request.json()

  // Обработка waitlist при дропе
  if (body.action === "processWaitlist") {
    try {
      const result = await processWaitlistOnDrop(params.id)
      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Ошибка обработки waitlist" },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 })
}


