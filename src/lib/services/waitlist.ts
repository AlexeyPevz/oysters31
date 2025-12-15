import { db } from "@/lib/db"
import type { WaitlistUpdateInput } from "@/lib/validation/waitlist"

export async function listWaitlist() {
  return db.waitlist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, name: true } },
    },
  })
}

export async function updateWaitlistEntry(id: string, payload: WaitlistUpdateInput) {
  return db.waitlist.update({
    where: { id },
    data: {
      notified: payload.notified,
    },
  })
}

export async function deleteWaitlistEntry(id: string) {
  return db.waitlist.delete({ where: { id } })
}
