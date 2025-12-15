import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"

export default async function WaitlistPage() {
  await requireSession(UserRole.ADMIN)

  // Get all supply waitlist entries
  const waitlistEntries = await db.supplyWaitlist.findMany({
    include: {
      supply: true,
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Лист ожидания поставок</h1>
        <p className="text-gray-400 mb-8">Все записи на поставки товаров</p>

        {waitlistEntries.length === 0 ? (
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
            Записей в листе ожидания пока нет
          </div>
        ) : (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Поставка</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Клиент</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Телефон</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Адрес</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Товар</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Кол-во</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Дата доставки</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Время</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Создано</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {waitlistEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.supply.name}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(entry.supply.supplyDate).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">{entry.clientName}</td>
                    <td className="px-4 py-3">{entry.phone}</td>
                    <td className="px-4 py-3 text-sm">{entry.deliveryAddress}</td>
                    <td className="px-4 py-3">{entry.product.name}</td>
                    <td className="px-4 py-3">{entry.quantity} шт</td>
                    <td className="px-4 py-3">
                      {new Date(entry.deliveryDate).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })}
                    </td>
                    <td className="px-4 py-3">{entry.deliveryTimeSlot}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(entry.createdAt).toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
