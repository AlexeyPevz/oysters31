import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getSupplies } from "@/lib/services/supply"
import { adminListProducts } from "@/lib/services/product"
import { SupplyManager } from "@/components/admin/SupplyManager"

export default async function DropsPage() {
  await requireSession(UserRole.ADMIN)
  const [supplies, products] = await Promise.all([
    getSupplies(true),
    adminListProducts({ limit: 100 }), // Use admin function with max allowed limit
  ])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <SupplyManager initialSupplies={supplies} products={products.items} />
    </div>
  )
}
