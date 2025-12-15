import { UserRole } from "@prisma/client"
import { listOrders } from "@/lib/services/order"
import { db } from "@/lib/db"
import { OrdersManager } from "@/components/admin/OrdersManager"

export default async function AdminOrdersPage() {
  const [orders, couriers] = await Promise.all([
    listOrders({ limit: 50 }),
    db.user.findMany({ where: { role: UserRole.COURIER, isActive: true }, select: { id: true, name: true, phone: true } }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-400">Операционный контур</p>
        <h1 className="text-4xl font-bold">Заказы</h1>
      </div>
      <OrdersManager initialData={orders} couriers={couriers} />
    </div>
  )
}
