import { db } from "@/lib/db"
import type { BannerInput } from "@/lib/validation/banner"

export async function listBanners() {
  return db.banner.findMany({ orderBy: { displayOrder: "asc" } })
}

export async function createBanner(payload: BannerInput) {
  return db.banner.create({
    data: {
      imageUrl: payload.imageUrl,
      title: payload.title,
      subtitle: payload.subtitle,
      buttonText: payload.buttonText,
      buttonLink: payload.buttonLink,
      isActive: payload.isActive,
      displayOrder: payload.displayOrder,
    },
  })
}

export async function updateBanner(id: string, payload: Partial<BannerInput>) {
  return db.banner.update({
    where: { id },
    data: {
      ...payload,
    },
  })
}

export async function deleteBanner(id: string) {
  return db.banner.delete({ where: { id } })
}
