"use client"

import { useState } from "react"
import { RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RefreshButton() {
  const [pending, setPending] = useState(false)

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true)
        window.location.reload()
      }}
      className="bg-yellow-400 text-black hover:bg-yellow-300"
    >
      <RefreshCcw className="size-4" />
      {pending ? "Обновляем..." : "Повторить попытку"}
    </Button>
  )
}