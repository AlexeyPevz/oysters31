import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { createCloudPaymentsPayment, createYooKassaPayment } from "@/lib/services/payment"
import { serverEnv, featureFlags } from "@/lib/env"

const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(["cloudpayments", "yookassa"]),
})

export async function POST(request: NextRequest) {
  if (!featureFlags.onlinePayments) {
    return NextResponse.json({ error: "Онлайн-платежи отключены" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = createPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { orderId, provider } = parsed.data

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 })
    }

    if (order.paymentMethod !== "ONLINE") {
      return NextResponse.json({ error: "Заказ не предназначен для онлайн-оплаты" }, { status: 400 })
    }

    let result
    if (provider === "cloudpayments") {
      result = await createCloudPaymentsPayment(order)
    } else {
      result = await createYooKassaPayment(order)
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
    })
  } catch (error) {
    console.error("Create payment error", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка создания платежа" },
      { status: 500 }
    )
  }
}

