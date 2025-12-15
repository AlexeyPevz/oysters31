import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { createCheckoutOrder } from "./order"
import { sendSMS, sendEmail, sendTelegram } from "./notification"
import { broadcastPushNotification } from "./push"

export type CreateDropPayload = {
  productId: string
  dropDate: Date | string
  quantity?: number
}

export async function createDrop(payload: CreateDropPayload) {
  return db.productDrop.create({
    data: {
      productId: payload.productId,
      dropDate: typeof payload.dropDate === "string" ? new Date(payload.dropDate) : payload.dropDate,
      quantity: payload.quantity,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  })
}

export async function listDrops(filters?: { productId?: string; isActive?: boolean }) {
  return db.productDrop.findMany({
    where: {
      ...(filters?.productId && { productId: filters.productId }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
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
    orderBy: { dropDate: "asc" },
  })
}

export async function getAvailableDeliveryDates(dropDate: Date, daysAhead = 3): Promise<Date[]> {
  const dates: Date[] = []
  const start = new Date(dropDate)
  start.setDate(start.getDate() + 1) // Начинаем со следующего дня после дропа

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  return dates
}

/**
 * Обрабатывает waitlist при дропе товара - создает заказы автоматически
 */
export async function processWaitlistOnDrop(dropId: string) {
  const drop = await db.productDrop.findUnique({
    where: { id: dropId },
    include: {
      product: true,
      waitlist: {
        where: { autoOrderCreated: false },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!drop) {
    throw new Error("Дроп не найден")
  }

  const createdOrders: string[] = []

  for (const entry of drop.waitlist) {
    try {
      // Определяем дату доставки (предпочитаемая или дроп + 1 день)
      const deliveryDate = entry.preferredDate
        ? new Date(entry.preferredDate)
        : new Date(drop.dropDate)
      deliveryDate.setDate(deliveryDate.getDate() + 1)

      // Создаем заказ из waitlist
      const order = await createCheckoutOrder({
        items: [
          {
            productId: drop.productId,
            name: drop.product.name,
            unit: drop.product.unit,
            price: Number(drop.product.price),
            quantity: entry.quantity,
          },
        ],
        customer: {
          name: entry.clientName,
          phone: entry.phone,
          email: entry.email || undefined,
        },
        delivery: {
          street: "", // Нужно будет получить из профиля клиента или запросить
          house: "",
          date: deliveryDate.toISOString().split("T")[0],
          slot: entry.preferredSlot || "DAY",
        },
        paymentMethod: "CASH",
        consent: true,
      })

      // Помечаем waitlist entry как обработанный
      await db.waitlist.update({
        where: { id: entry.id },
        data: { autoOrderCreated: true },
      })

      createdOrders.push(order.id)

      // Уведомляем клиента
      await Promise.allSettled([
        sendSMS(entry.phone, `Ваш предзаказ на ${drop.product.name} готов! Заказ №${order.orderNumber} создан.`),
        sendEmail(
          entry.email,
          `Предзаказ готов: ${drop.product.name}`,
          `<p>Ваш предзаказ готов к доставке!</p><p>Заказ №${order.orderNumber}</p>`
        ),
      ])
    } catch (error) {
      console.error(`Ошибка создания заказа из waitlist ${entry.id}:`, error)
    }
  }

  return { created: createdOrders.length, orderIds: createdOrders }
}

