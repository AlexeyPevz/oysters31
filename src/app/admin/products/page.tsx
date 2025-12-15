import { adminListProducts } from "@/lib/services/product"
import { ProductManager } from "@/components/admin/ProductManager"

export default async function AdminProductsPage() {
  const result = await adminListProducts({ limit: 50 })

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-400">Каталог</p>
        <h1 className="text-4xl font-bold">Товары и промо</h1>
      </div>
      <ProductManager initialData={result} />
    </div>
  )
}
