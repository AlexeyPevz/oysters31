import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { getOpsDashboardData } from "@/lib/services/operations"
import { OpsDashboard } from "@/components/ops/OpsDashboard"

const allowedRoles = [UserRole.ADMIN, UserRole.STAFF]

export default async function OpsPage() {
  await requireSession(allowedRoles)
  const data = await getOpsDashboardData()
  return <OpsDashboard initialData={data} />
}
