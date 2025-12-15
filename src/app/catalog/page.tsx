import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { CatalogFilters, type CatalogFilterValues } from "@/components/catalog/CatalogFilters"
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard"
import { listPublicProducts } from "@/lib/services/product"
import { ProductCategory, ProductStatus } from "@prisma/client"
import { z } from "zod"
import type { FeaturedProduct } from "@/components/FeaturedProducts"

const searchSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(["price", "createdAt", "displayOrder"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
})

const categoryOptions = [{ value: "all", label: "Все категории" }, ...Object.values(ProductCategory).map((category) => ({
  value: category,
  label: translateCategory(category),
}))]

const statusOptions = [
  { value: "all", label: "Все статусы" },
  { value: ProductStatus.AVAILABLE, label: "В наличии" },
  { value: ProductStatus.PREORDER, label: "Предзаказ" },
  { value: ProductStatus.SOON, label: "Скоро" },
]

function translateCategory(category: ProductCategory) {
  switch (category) {
    case ProductCategory.OYSTERS:
      return "Устрицы"
    case ProductCategory.SEA_URCHINS:
      return "Морские ежи"
    case ProductCategory.SCALLOPS:
      return "Гребешки"
    case ProductCategory.CAVIAR:
      return "Икра"
    case ProductCategory.SHRIMP:
      return "Креветки"
    case ProductCategory.STURGEON:
      return "Осетровые"
    default:
      return "Другое"
  }
}

function serializeSearchParams(source: Record<string, string>, overrides?: Record<string, string | number>) {
  const params = new URLSearchParams()
  Object.entries(source).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value)
  })
  if (overrides) {
    Object.entries(overrides).forEach(([key, value]) => {
      if (!value || value === "all") {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })
  }
  return params.toString()
}

export default async function CatalogPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const parsed = searchSchema.parse({
    category: typeof searchParams.category === "string" ? searchParams.category : undefined,
    status: typeof searchParams.status === "string" ? searchParams.status : undefined,
    sortBy: typeof searchParams.sortBy === "string" ? searchParams.sortBy : undefined,
    sortOrder: typeof searchParams.sortOrder === "string" ? searchParams.sortOrder : undefined,
    search: typeof searchParams.search === "string" ? searchParams.search : undefined,
    page: typeof searchParams.page === "string" ? searchParams.page : undefined,
  })

  const filters: CatalogFilterValues = {
    category: parsed.category ?? "all",
    status: parsed.status ?? "all",
    sortBy: parsed.sortBy ?? "displayOrder",
    sortOrder: parsed.sortOrder ?? "asc",
    search: parsed.search ?? "",
  }

  const result = await listPublicProducts({
    category: filters.category === "all" ? undefined : (filters.category as ProductCategory),
    status: filters.status === "all" ? undefined : (filters.status as ProductStatus),
    sortBy: filters.sortBy as "price" | "createdAt" | "displayOrder",
    sortOrder: filters.sortOrder,
    search: filters.search || undefined,
    page: parsed.page ?? 1,
    limit: 12,
  })

  const products: FeaturedProduct[] = result.items.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    unit: product.unit,
    shortDescription: product.shortDescription,
    status: product.status,
    imageUrls: (() => {
      if (!product.imageUrls) return []
      // Prisma Json type может вернуть уже распарсенный массив или строку
      if (Array.isArray(product.imageUrls)) {
        return product.imageUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
      }
      if (typeof product.imageUrls === 'string') {
        try {
          const parsed = JSON.parse(product.imageUrls)
          return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === 'string' && url.length > 0) : []
      } catch {
        return []
        }
      }
      return []
    })(),
  }))

  const currentSearch = {
    category: filters.category,
    status: filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    search: filters.search,
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="pt-24 pb-16 space-y-10">
        <section className="container mx-auto px-4 space-y-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold">Каталог морепродуктов</h1>
            <p className="text-gray-400">Свежие устрицы, морские ежи и красная икра с доставкой в течение часа.</p>
          </div>
          <CatalogFilters categories={categoryOptions} statuses={statusOptions} initialValues={filters} />
        </section>

        <section className="container mx-auto px-4">
          {products.length === 0 ? (
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-10 text-center">
              <p className="text-lg text-gray-300">По выбранным фильтрам ничего не найдено. Измените условия поиска и попробуйте снова.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <CatalogProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {result.pagination.pages > 1 && (
            <div className="flex justify-center mt-10 gap-2">
              {Array.from({ length: result.pagination.pages }).map((_, index) => {
                const pageNumber = index + 1
                const searchString = serializeSearchParams(currentSearch, { page: pageNumber })
                const isActive = pageNumber === result.pagination.page
                return (
                  <Link
                    key={pageNumber}
                    href={`/catalog?${searchString}`}
                    className={`px-4 py-2 rounded-full border ${isActive ? "border-yellow-400 text-yellow-400" : "border-gray-800 text-gray-400 hover:text-white"}`}
                  >
                    {pageNumber}
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
