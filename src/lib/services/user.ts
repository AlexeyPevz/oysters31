import { Prisma, UserRole } from "@prisma/client"
import { db } from "@/lib/db"
import { paginationSchema } from "@/lib/validation/common"

export type UserFilters = {
  role?: UserRole | "all"
  search?: string
  page?: number
  limit?: number
}

export async function listUsers(filters: UserFilters = {}) {
  const pagination = paginationSchema.parse({ page: filters.page, limit: filters.limit ?? 20 })

  const where: Prisma.UserWhereInput = {}
  if (filters.role && filters.role !== "all") {
    where.role = filters.role
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    db.user.count({ where }),
  ])

  return {
    items: users,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit) || 1,
    },
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  return db.user.update({
    where: { id: userId },
    data: { role },
  })
}
