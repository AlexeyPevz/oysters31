import Header from '@/components/Header'
import Hero from '@/components/Hero'
import { FeaturedProducts, FeaturedProduct } from '@/components/FeaturedProducts'
import Contacts from '@/components/Contacts'
import Footer from '@/components/Footer'
import { SupplyBanner } from '@/components/SupplyBanner'
import { listPublicProducts } from '@/lib/services/product'
import { getSettings } from '@/lib/services/settings'
import { getActiveSupply } from '@/lib/services/supply'

export default async function HomePage() {
  const [featured, settings, activeSupply] = await Promise.all([
    listPublicProducts({ limit: 6, promoted: true }),
    getSettings(),
    getActiveSupply(),
  ])
  const featuredProducts: FeaturedProduct[] = featured.items.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    unit: product.unit,
    shortDescription: product.shortDescription,
    status: product.status,
    isPromoted: product.isPromoted,
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="pt-20 space-y-16">
        {activeSupply ? (
          <SupplyBanner supply={activeSupply} />
        ) : (
          <Hero phone={settings.contactPhone} />
        )}
        <FeaturedProducts products={featuredProducts} />
        <Contacts settings={settings} />
      </main>
      <Footer settings={settings} />
    </div>
  )
}






