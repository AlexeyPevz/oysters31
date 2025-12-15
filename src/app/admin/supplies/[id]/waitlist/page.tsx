import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getSupplyById } from "@/lib/services/supply"
import { notFound } from "next/navigation"

export default async function SupplyWaitlistPage({ params }: { params: { id: string } }) {
    await requireSession(UserRole.ADMIN)
    const supply = await getSupplyById(params.id)

    if (!supply) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">{supply.name}</h1>
                <p className="text-gray-400 mb-8">Лист ожидания</p>

                {supply.waitlist.length === 0 ? (
                    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
                        Записей в листе ожидания пока нет
                    </div>
                ) : (
                    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Клиент</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Телефон</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Адрес</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Товар</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Кол-во</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Дата доставки</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Время</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Создано</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {supply.waitlist.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-800/30">
                                        <td className="px-4 py-3">{entry.clientName}</td>
                                        <td className="px-4 py-3">{entry.phone}</td>
                                        <td className="px-4 py-3 text-sm">{entry.deliveryAddress}</td>
                                        <td className="px-4 py-3 text-gray-400">{entry.email || "-"}</td>
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
