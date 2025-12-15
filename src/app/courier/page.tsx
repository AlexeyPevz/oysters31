import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getCourierDashboardData } from "@/lib/services/operations"
import { CourierDashboard } from "@/components/courier/CourierDashboard"

export default async function CourierPage() {
  const session = await requireSession(UserRole.COURIER)
  const data = await getCourierDashboardData(session.userId)
  return <CourierDashboard initialData={data} />
}
