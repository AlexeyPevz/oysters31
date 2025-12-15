import { getSupplies } from "@/lib/services/supply"
import { listPublicProducts } from "@/lib/services/product"
import { SupplyManager } from "@/components/admin/SupplyManager"

export default async function SuppliesPage() {
    const [supplies, products] = await Promise.all([
        getSupplies(true),
        listPublicProducts({ limit: 1000 }),
    ])

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <SupplyManager initialSupplies={supplies} products={products.items} />
        </div>
    )
}
