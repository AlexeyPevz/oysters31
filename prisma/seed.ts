import { PrismaClient, ProductCategory, UserRole } from "@prisma/client"
import { hashPassword } from "../src/lib/auth/password"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const adminPassword = await hashPassword("ChangeMe123!")

  await prisma.user.upsert({
    where: { phone: "+79991234567" },
    update: { passwordHash: adminPassword },
    create: {
      name: "Администратор",
      phone: "+79991234567",
      email: "pevzner.alexey@yandex.ru",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  const products = [
    {
      name: "Устрицы Фина де Клер",
      slug: "fines-de-claire",
      category: ProductCategory.OYSTERS,
      price: 390,
      unit: "шт",
      shortDescription: "Классические французские устрицы",
      isPromoted: true,
      imageUrls: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836"],
    },
    {
      name: "Красная икра",
      slug: "red-caviar",
      category: ProductCategory.CAVIAR,
      price: 9500,
      unit: "100г",
      shortDescription: "Деликатес премиум класса",
      isPromoted: true,
      imageUrls: ["https://images.unsplash.com/photo-1508739773434-c26b3d09e071"],
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    })
  }

  await prisma.banner.upsert({
    where: { id: "demo-banner" },
    update: {},
    create: {
      id: "demo-banner",
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
      title: "Свежие устрицы",
      subtitle: "Доставка за 60 минут",
      buttonText: "Смотреть каталог",
      buttonLink: "/catalog",
      displayOrder: 1,
    },
  })

  console.log("Seed completed")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
