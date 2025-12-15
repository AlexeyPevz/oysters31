import crypto from "crypto"
import { db } from "@/lib/db"
import { serverEnv } from "@/lib/env"
import type { Order } from "@prisma/client"

export type PaymentProvider = "cloudpayments" | "yookassa"

export type PaymentResult = {
  success: boolean
  orderId: string
  paymentId?: string
  error?: string
}

/**
 * Создает платеж через CloudPayments
 */
export async function createCloudPaymentsPayment(order: Order): Promise<{ paymentUrl?: string; error?: string }> {
  if (!serverEnv.CLOUDPAYMENTS_PUBLIC_ID || !serverEnv.CLOUDPAYMENTS_SECRET_KEY) {
    return { error: "CloudPayments не настроен" }
  }

  try {
    // CloudPayments использует форму оплаты на их стороне
    // Возвращаем данные для формы
    const amount = Number(order.totalAmount)
    const description = `Заказ №${order.orderNumber}`

    return {
      paymentUrl: `https://widget.cloudpayments.ru/pay?publicId=${serverEnv.CLOUDPAYMENTS_PUBLIC_ID}&invoiceId=${order.id}&amount=${amount}&currency=RUB&description=${encodeURIComponent(description)}`,
    }
  } catch (error) {
    console.error("createCloudPaymentsPayment: Error", { orderId: order.id, error })
    return { error: error instanceof Error ? error.message : "Ошибка создания платежа" }
  }
}

/**
 * Создает платеж через YooKassa
 */
export async function createYooKassaPayment(order: Order): Promise<{ paymentUrl?: string; paymentId?: string; error?: string }> {
  if (!serverEnv.YUKASSA_SHOP_ID || !serverEnv.YUKASSA_SECRET_KEY) {
    return { error: "YooKassa не настроен" }
  }

  try {
    const amount = Number(order.totalAmount)
    const description = `Заказ №${order.orderNumber}`

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": order.id,
        Authorization: `Basic ${Buffer.from(`${serverEnv.YUKASSA_SHOP_ID}:${serverEnv.YUKASSA_SECRET_KEY}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: "RUB",
        },
        description,
        confirmation: {
          type: "redirect",
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/orders/${order.id}/success`,
        },
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("createYooKassaPayment: API error", { orderId: order.id, status: response.status, error: errorData })
      return { error: `Ошибка YooKassa: ${response.status}` }
    }

    const data = await response.json()
    return {
      paymentUrl: data.confirmation?.confirmation_url,
      paymentId: data.id,
    }
  } catch (error) {
    console.error("createYooKassaPayment: Error", { orderId: order.id, error })
    return { error: error instanceof Error ? error.message : "Ошибка создания платежа" }
  }
}

/**
 * Верифицирует webhook от CloudPayments
 */
export function verifyCloudPaymentsWebhook(body: string, signature: string): boolean {
  if (!serverEnv.CLOUDPAYMENTS_SECRET_KEY) {
    return false
  }

  try {
    const hmac = crypto.createHmac("sha256", serverEnv.CLOUDPAYMENTS_SECRET_KEY)
    hmac.update(body)
    const calculatedSignature = hmac.digest("hex")
    return calculatedSignature === signature
  } catch (error) {
    console.error("verifyCloudPaymentsWebhook: Error", { error })
    return false
  }
}

/**
 * Верифицирует webhook от YooKassa
 */
export function verifyYooKassaWebhook(body: string, signature: string): boolean {
  if (!serverEnv.YUKASSA_SECRET_KEY) {
    return false
  }

  try {
    const hmac = crypto.createHmac("sha256", serverEnv.YUKASSA_SECRET_KEY)
    hmac.update(body)
    const calculatedSignature = hmac.digest("hex")
    return calculatedSignature === signature
  } catch (error) {
    console.error("verifyYooKassaWebhook: Error", { error })
    return false
  }
}

/**
 * Обрабатывает успешный платеж
 */
export async function handlePaymentSuccess(orderId: string, paymentId: string, provider: PaymentProvider): Promise<PaymentResult> {
  try {
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return { success: false, orderId, error: "Заказ не найден" }
    }

    // Обновляем статус заказа (можно добавить поле paymentId в схему)
    await db.order.update({
      where: { id: orderId },
      data: {
        // Здесь можно добавить поле paymentId если нужно
      },
    })

    return { success: true, orderId, paymentId }
  } catch (error) {
    console.error("handlePaymentSuccess: Error", { orderId, paymentId, provider, error })
    return {
      success: false,
      orderId,
      error: error instanceof Error ? error.message : "Ошибка обработки платежа",
    }
  }
}

