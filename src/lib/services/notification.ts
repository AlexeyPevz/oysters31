import nodemailer from "nodemailer"
import type { Order, DeliverySlot } from "@prisma/client"
import { loadNotificationSettings } from "@/lib/services/notification-config"
import { getSlotLabel } from "@/lib/order-workflow"

let cachedMailTransport: nodemailer.Transporter | null = null
let cachedMailKey = ""

const defaultSmsEndpoint = "https://sms.ru/sms/send"
const fallbackEmailFrom = "notifications@oysters.local"

const getError = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

async function getConfig() {
  return loadNotificationSettings()
}

async function getMailTransport(smtpUrl?: string) {
  if (!smtpUrl) return null
  if (cachedMailTransport && cachedMailKey === smtpUrl) {
    return cachedMailTransport
  }
  try {
    cachedMailTransport = nodemailer.createTransport(smtpUrl)
    cachedMailKey = smtpUrl
    return cachedMailTransport
  } catch (error) {
    console.error("SMTP transport init failed", getError(error))
    return null
  }
}

type ContactInfo = {
  email?: string | null
  phone?: string | null
}

async function safeFetch(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, init)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
    return response
  } catch (error) {
    console.error("Notification request failed", { url, error })
    return null
  }
}

export async function sendSMS(phone: string | null | undefined, message: string) {
  if (!phone) {
    console.warn("sendSMS: phone is not provided")
    return
  }
  try {
    const config = await getConfig()
    const sms = config.sms
    if (!sms?.apiKey) {
      console.warn("sendSMS: SMS API key is not configured")
      return
    }

    const params = new URLSearchParams({
      api_id: sms.apiKey,
      to: phone,
      msg: message,
    })
    if (sms.senderId) {
      params.set("from", sms.senderId)
    }

    const response = await safeFetch(sms.apiUrl ?? defaultSmsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    })
    
    if (!response) {
      console.error("sendSMS: Failed to send SMS", { phone, message: message.substring(0, 50) })
    }
  } catch (error) {
    console.error("sendSMS: Unexpected error", { phone, error: getError(error) })
  }
}

export async function sendEmail(to: string | null | undefined, subject: string, html: string, text?: string) {
  if (!to) {
    console.warn("sendEmail: recipient email is not provided")
    return
  }
  try {
    const config = await getConfig()
    const email = config.email
    if (!email?.smtpUrl) {
      console.warn("sendEmail: SMTP URL is not configured")
      return
    }

    const transport = await getMailTransport(email.smtpUrl)
    if (!transport) {
      console.error("sendEmail: Failed to initialize mail transport")
      return
    }

    await transport.sendMail({
      from: email.from ?? fallbackEmailFrom,
      to,
      subject,
      html,
      text,
    })
  } catch (error) {
    console.error("sendEmail: Failed to send email", { to, subject, error: getError(error) })
  }
}

export async function sendTelegram(message: string, targetChatId?: string) {
  try {
    const config = await getConfig()
    const telegram = config.telegram
    if (!telegram?.botToken) {
      console.warn("sendTelegram: Bot token is not configured")
      return
    }
    const chatId = targetChatId || telegram.chatId
    if (!chatId) {
      console.warn("sendTelegram: Chat ID is not configured")
      return
    }

    const body = new URLSearchParams({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    })

    const response = await safeFetch(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
      method: "POST",
      body,
    })
    
    if (!response) {
      console.error("sendTelegram: Failed to send message", { chatId, message: message.substring(0, 50) })
    }
  } catch (error) {
    console.error("sendTelegram: Unexpected error", { error: getError(error) })
  }
}

function buildOrderSummary(order: Order) {
  return `Заказ №${order.orderNumber}
Сумма: ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽
Статус: ${order.status}`
}

export async function sendNewOrderNotification(order: Order, contact?: ContactInfo) {
  try {
    const adminMessage = `🧾 <b>Новый заказ</b>
№ ${order.orderNumber}
Статус: ${order.status}
Сумма: ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽`
    await sendTelegram(adminMessage)

    // Уведомление повару (STAFF)
    await notifyStaffAboutNewOrder(order)

    const customerMessage = `Ваш заказ №${order.orderNumber} принят. Мы свяжемся для подтверждения.`
    const results = await Promise.allSettled([
      sendSMS(contact?.phone, customerMessage),
      sendEmail(
        contact?.email,
        `Заказ №${order.orderNumber} принят`,
        `<p>Спасибо за заказ!</p><p>${buildOrderSummary(order)}</p>`
      ),
    ])
    
    // Логируем неудачные попытки
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`sendNewOrderNotification: Failed to send ${index === 0 ? "SMS" : "Email"}`, {
          orderNumber: order.orderNumber,
          error: result.reason,
        })
      }
    })
  } catch (error) {
    console.error("sendNewOrderNotification: Unexpected error", {
      orderNumber: order.orderNumber,
      error: getError(error),
    })
  }
}

/**
 * Уведомляет поваров (STAFF) о новом заказе
 */
async function notifyStaffAboutNewOrder(order: Order) {
  try {
    const { db } = await import("@/lib/db")
    const { UserRole } = await import("@prisma/client")
    const { broadcastPushNotification } = await import("@/lib/services/push")

    // Получаем всех активных поваров
    const staffUsers = await db.user.findMany({
      where: {
        role: UserRole.STAFF,
        isActive: true,
      },
      select: { id: true },
    })

    if (staffUsers.length === 0) return

    const userIds = staffUsers.map((u) => u.id)
    const message = `Новый заказ №${order.orderNumber} на ${new Date(order.deliveryDate).toLocaleDateString("ru-RU")}, ${getSlotLabel(order.slot)}`

    await Promise.allSettled([
      broadcastPushNotification(
        {
          title: "Новый заказ",
          body: message,
          url: "/ops",
        },
        { userIds }
      ),
      sendTelegram(`👨‍🍳 Поварам: ${message}`),
    ])
  } catch (error) {
    console.error("notifyStaffAboutNewOrder: Error", { error: getError(error) })
  }
}

export async function sendStatusNotification(order: Order, contact?: ContactInfo) {
  try {
    const adminMessage = `📦 Обновление заказа ${order.orderNumber}: ${order.status}`
    await sendTelegram(adminMessage)

    const customerMessage = `Статус заказа №${order.orderNumber}: ${order.status}`
    const results = await Promise.allSettled([
      sendSMS(contact?.phone, customerMessage),
      sendEmail(
        contact?.email,
        `Статус заказа №${order.orderNumber}`,
        `<p>Статус обновлён: <strong>${order.status}</strong></p><p>${buildOrderSummary(order)}</p>`
      ),
    ])
    
    // Логируем неудачные попытки
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`sendStatusNotification: Failed to send ${index === 0 ? "SMS" : "Email"}`, {
          orderNumber: order.orderNumber,
          error: result.reason,
        })
      }
    })
  } catch (error) {
    console.error("sendStatusNotification: Unexpected error", {
      orderNumber: order.orderNumber,
      error: getError(error),
    })
  }
}
