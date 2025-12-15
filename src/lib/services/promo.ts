import { db } from "@/lib/db"
import type { PromoInput } from "@/lib/validation/promo"

export async function listPromoCodes() {
  return db.promoCode.findMany({ orderBy: { createdAt: "desc" } })
}

export async function createPromoCode(payload: PromoInput) {
  return db.promoCode.create({
    data: {
      code: payload.code,
      type: payload.type,
      value: payload.value,
      expiresAt: payload.expiresAt,
      maxUses: payload.maxUses ?? null,
      isActive: payload.isActive,
    },
  })
}

export async function updatePromoCode(id: string, payload: Partial<PromoInput>) {
  return db.promoCode.update({
    where: { id },
    data: {
      ...payload,
      expiresAt: payload.expiresAt ?? undefined,
      maxUses: payload.maxUses ?? undefined,
    },
  })
}

export async function deletePromoCode(id: string) {
  return db.promoCode.delete({ where: { id } })
}
