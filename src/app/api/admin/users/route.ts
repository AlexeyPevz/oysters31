import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { UserRole } from "@prisma/client"
import { requireSession } from "@/lib/auth/session"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    await requireSession(UserRole.ADMIN)
    
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page")) || 1
    const limit = Number(searchParams.get("limit")) || 20
    const search = searchParams.get("search") || ""
    
    const skip = (page - 1) * limit
    
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}
    
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { orders: true }
          }
        }
      }),
      db.user.count({ where })
    ])
    
    return NextResponse.json({
      items: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

const createUserSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  phone: z.string().min(10, "Телефон должен содержать минимум 10 символов"),
  email: z.string().email("Некорректный email").optional().nullable(),
  role: z.nativeEnum(UserRole),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
})

export async function POST(request: NextRequest) {
  try {
    await requireSession(UserRole.ADMIN)
    const json = await request.json()
    const parsed = createUserSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { name, phone, email, role, password } = parsed.data

    // Проверяем, существует ли пользователь с таким телефоном или email
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : [])
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким телефоном или email уже существует" },
        { status: 409 }
      )
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10)

    // Создаем пользователя
    const user = await db.user.create({
      data: {
        name,
        phone,
        email,
        role,
        passwordHash,
      },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    // Удаляем хеш пароля из ответа
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error("Failed to create user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
