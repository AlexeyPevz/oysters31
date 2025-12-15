import { NextRequest, NextResponse } from "next/server"
import { verifyYooKassaWebhook, handlePaymentSuccess } from "@/lib/services/payment"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("X-YooMoney-Signature") || ""

    if (!verifyYooKassaWebhook(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data = JSON.parse(body)
    
    // YooKassa отправляет события о статусе платежа
    if (data.event === "payment.succeeded") {
      const payment = data.object
      const orderId = payment.metadata?.orderId

      if (orderId && payment.id) {
        const result = await handlePaymentSuccess(orderId, payment.id, "yookassa")
        if (result.success) {
          return NextResponse.json({ success: true })
        }
      }
    }

    return NextResponse.json({ success: true, message: "Event processed" })
  } catch (error) {
    console.error("YooKassa webhook error", { error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

