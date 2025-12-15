"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  href?: string
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive"
  className?: string
}

export function BackButton({ 
  href, 
  label = "Назад", 
  variant = "outline",
  className 
}: BackButtonProps) {
  const router = useRouter()
  
  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }
  
  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}
