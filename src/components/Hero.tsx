import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const heroFeatures = [
  { label: "Быстрая доставка", badge: "60 мин", description: "Привезём за час" },
  { label: "Гарантия свежести", badge: "100%", description: "Контроль температуры" },
  { label: "Лучший выбор", badge: "50+", description: "Виды морепродуктов" },
]

interface HeroProps {
  phone?: string
}

export default function Hero({ phone = "+7 (4722) 55-35-55" }: HeroProps) {
  const telLink = `tel:${phone.replace(/\D/g, '')}`
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Фоновое изображение */}
      <div className="absolute inset-0 z-0">
        <div className="relative w-full h-full">
          <Image
            src="/images/seafood-hero-bg.jpg"
            alt="Свежие морепродукты"
            fill
            className="object-cover"
            priority
            quality={90}
            unoptimized={false}
          />
        </div>
        {/* Затемнение для читаемости текста */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>
      
      {/* Контент поверх фона */}
      <div className="relative z-10 text-center">
        <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Свежие устрицы и
          <span className="block text-yellow-400">деликатесы моря</span>
        </h1>

        <p className="text-lg lg:text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
          Доставка лучших устриц и морепродуктов в Белгороде. Свежие продукты из проверенных хозяйств мира прямо к вашему столу.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/catalog">
            <Button size="lg" className="bg-yellow-400 text-black hover:bg-yellow-500 text-lg px-8 py-6">
              Смотреть каталог
            </Button>
          </Link>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black text-lg px-8 py-6"
          >
            <a href={telLink}>{phone}</a>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {heroFeatures.map((feature) => (
            <div key={feature.label} className="text-center">
              <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">{feature.badge}</span>
                </div>
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.label}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
