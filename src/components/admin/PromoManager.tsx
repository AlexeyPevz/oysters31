"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PromoCode } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Неизвестная ошибка")

async function fetchPromos(): Promise<PromoCode[]> {
  const response = await fetch("/api/admin/promo-codes")
  if (!response.ok) {
    throw new Error("Не удалось загрузить промокоды")
  }
  return response.json()
}

async function savePromo({ id, payload }: { id?: string; payload: Partial<PromoCode> }) {
  const endpoint = id ? `/api/admin/promo-codes/${id}` : "/api/admin/promo-codes"
  const method = id ? "PUT" : "POST"
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка" }))
    throw new Error(error.error ?? "Не удалось сохранить")
  }
  return response.json()
}

async function deletePromo(id: string) {
  const response = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка" }))
    throw new Error(error.error ?? "Не удалось удалить")
  }
  return response.json()
}

export function PromoManager({ initialData }: { initialData: PromoCode[] }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PromoCode | null>(null)

  const query = useQuery({ queryKey: ["admin-promos"], queryFn: fetchPromos, initialData })

  const mutation = useMutation({
    mutationFn: savePromo,
    onSuccess: () => {
      toast.success("Промокод сохранён")
      queryClient.invalidateQueries({ queryKey: ["admin-promos"] })
      setDialogOpen(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePromo,
    onSuccess: () => {
      toast.success("Промокод удалён")
      queryClient.invalidateQueries({ queryKey: ["admin-promos"] })
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Скидки и активности</p>
        <Button className="bg-yellow-500 text-black hover:bg-yellow-400" onClick={() => { setEditing(null); setDialogOpen(true) }}>
          Добавить промокод
        </Button>
      </div>
      <div className="grid gap-3">
        {query.data.map((promo) => (
          <div key={promo.id} className="rounded-2xl border border-gray-900 bg-gray-950/70 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-white font-semibold tracking-[0.3em]">{promo.code}</p>
              <p className="text-sm text-gray-400">
                {promo.type === "PERCENTAGE" ? `${promo.value}%` : `${promo.value} ₽`} · действует до {new Date(promo.expiresAt).toLocaleDateString("ru-RU")}
              </p>
              <p className="text-xs text-gray-500">Использовано {promo.currentUses ?? 0}{promo.maxUses ? ` / ${promo.maxUses}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-gray-800 text-gray-100" onClick={() => { setEditing(promo); setDialogOpen(true) }}>
                Редактировать
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(promo.id)}>
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </div>
      <PromoDialog open={dialogOpen} onOpenChange={setDialogOpen} promo={editing} loading={mutation.isPending} onSubmit={(payload) => mutation.mutate(payload)} />
    </div>
  )
}

type PromoState = {
  code: string
  type: PromoCode["type"]
  value: string
  expiresAt: string
  maxUses: string
  isActive: boolean
}

const emptyPromo: PromoState = {
  code: "",
  type: "PERCENTAGE",
  value: "5",
  expiresAt: new Date().toISOString().slice(0, 10),
  maxUses: "",
  isActive: true,
}

function PromoDialog({ open, onOpenChange, promo, onSubmit, loading }: { open: boolean; onOpenChange: (value: boolean) => void; promo: PromoCode | null; onSubmit: (payload: { id?: string; payload: any }) => void; loading: boolean }) {
  const [form, setForm] = useState<PromoState>(emptyPromo)

  useEffect(() => {
    if (promo) {
      setForm({
        code: promo.code,
        type: promo.type,
        value: String(promo.value ?? 0),
        expiresAt: new Date(promo.expiresAt).toISOString().slice(0, 10),
        maxUses: promo.maxUses ? String(promo.maxUses) : "",
        isActive: promo.isActive,
      })
    } else {
      setForm(emptyPromo)
    }
  }, [promo])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      id: promo?.id,
      payload: {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        expiresAt: new Date(form.expiresAt),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        isActive: form.isActive,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 text-white border border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle>{promo ? "Редактировать промокод" : "Новый промокод"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Код</Label>
            <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} className="bg-gray-900 border-gray-800 uppercase" required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Тип</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as PromoCode["type"] }))}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  <SelectItem value="PERCENTAGE" className="text-white">
                    % от суммы
                  </SelectItem>
                  <SelectItem value="FIXED" className="text-white">
                    Фиксированная скидка
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Значение</Label>
              <Input type="number" value={form.value} onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Действует до</Label>
              <Input type="date" value={form.expiresAt} onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <Label>Лимит использований</Label>
              <Input type="number" value={form.maxUses} onChange={(event) => setForm((prev) => ({ ...prev, maxUses: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(form.isActive)} onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value === "true" }))}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                <SelectItem value="true" className="text-white">
                  Активен
                </SelectItem>
                <SelectItem value="false" className="text-white">
                  Отключён
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
