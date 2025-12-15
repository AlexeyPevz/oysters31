"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/stores/cart"
import { ShoppingCart, Menu, X, User, Search } from "lucide-react"

const navLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/catalog?status=PREORDER", label: "Доставка" },
  { href: "#story", label: "О нас" },
  { href: "#contacts", label: "Контакты" },
]

export default function Header() {
  const router = useRouter()
  const totalItems = useCartStore((state) => state.totalItems)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSearch = () => router.push("/catalog?focus=search")

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/95 backdrop-blur-md shadow-lg" : "bg-black/90 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0">
              <Image
                src="/images/logo.png?v=2"
                alt="Oysters Logo"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl lg:text-2xl font-bold text-white">Oysters Белгород</h1>
              <p className="text-xs lg:text-sm text-yellow-400">Премиальные морепродукты</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-white hover:text-yellow-400 transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-3 lg:space-x-4">
            <Button variant="ghost" size="icon" className="text-white hover:text-yellow-400" onClick={handleSearch}>
              <Search className="h-5 w-5" />
            </Button>

            <Link href="/profile">
              <Button variant="ghost" size="icon" className="text-white hover:text-yellow-400">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            <Link href="/cart">
              <Button className="relative bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {Math.min(totalItems, 99)}
                  </span>
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:text-yellow-400"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-800">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white hover:text-yellow-400 transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

