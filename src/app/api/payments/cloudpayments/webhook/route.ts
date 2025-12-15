import { NextRequest, NextResponse } from "next/server"
import { verifyCloudPaymentsWebhook, handlePaymentSuccess } from "@/lib/services/payment"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("X-CloudPayments-Signature") || ""

    if (!verifyCloudPaymentsWebhook(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const data = JSON.parse(body)
    
    // CloudPayments отправляет разные типы событий
    if (data.Type === "Check" || data.Type === "Pay") {
      const orderId = data.InvoiceId
      const paymentId = data.TransactionId

      if (orderId && paymentId) {
        const result = await handlePaymentSuccess(orderId, String(paymentId), "cloudpayments")
        if (result.success) {
          return NextResponse.json({ success: true })
        }
      }
    }

    return NextResponse.json({ success: true, message: "Event processed" })
  } catch (error) {
    console.error("CloudPayments webhook error", { error })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

