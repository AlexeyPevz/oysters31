"use client"

import { useTransition } from "react"
import { UserRole } from "@prisma/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Props {
  userId: string
  currentRole: UserRole
}

const roles = Object.values(UserRole)

export function UserRoleForm({ userId, currentRole }: Props) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const updateRole = (role: UserRole) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        })
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Не удалось обновить роль" }))
          throw new Error(error.error)
        }
        toast({ title: "Роль обновлена", description: `Назначено: ${role}` })
      } catch (error: any) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" })
      }
    })
  }

  return (
    <Select defaultValue={currentRole} disabled={isPending} onValueChange={(value) => updateRole(value as UserRole)}>
      <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-gray-800 text-white">
        {roles.map((role) => (
          <SelectItem key={role} value={role} className="text-white">
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
