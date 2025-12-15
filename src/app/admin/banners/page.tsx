import { listBanners } from "@/lib/services/banner"
import { BannerManager } from "@/components/admin/BannerManager"

export default async function AdminBannersPage() {
  const banners = await listBanners()
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-400">Главная страница</p>
        <h1 className="text-4xl font-bold">Баннеры и акции</h1>
      </div>
      <BannerManager initialData={banners} />
    </div>
  )
}
