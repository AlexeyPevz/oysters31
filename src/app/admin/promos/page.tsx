import { listPromoCodes } from "@/lib/services/promo"
import { PromoManager } from "@/components/admin/PromoManager"

export default async function AdminPromosPage() {
  const promos = await listPromoCodes()
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-400">Программы лояльности</p>
        <h1 className="text-4xl font-bold">Промокоды</h1>
      </div>
      <PromoManager initialData={promos} />
    </div>
  )
}
