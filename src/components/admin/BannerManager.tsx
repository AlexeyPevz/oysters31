"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Banner } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Неизвестная ошибка")

async function fetchBanners(): Promise<Banner[]> {
  const response = await fetch("/api/admin/banners")
  if (!response.ok) {
    throw new Error("Не удалось загрузить баннеры")
  }
  return response.json()
}

async function saveBanner({ id, payload }: { id?: string; payload: Partial<Banner> }) {
  const endpoint = id ? `/api/admin/banners/${id}` : "/api/admin/banners"
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

async function deleteBannerRequest(id: string) {
  const response = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка" }))
    throw new Error(error.error ?? "Не удалось удалить")
  }
  return response.json()
}

export function BannerManager({ initialData }: { initialData: Banner[] }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)

  const query = useQuery({
    queryKey: ["admin-banners"],
    queryFn: fetchBanners,
    initialData,
  })

  const mutation = useMutation({
    mutationFn: saveBanner,
    onSuccess: () => {
      toast.success("Баннер сохранён")
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] })
      setDialogOpen(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBannerRequest,
    onSuccess: () => {
      toast.success("Баннер удалён")
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] })
    },
    onError: (error) => toast.error(getErrorMessage(error))
  })

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (banner: Banner) => {
    setEditing(banner)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">Главный экран и промо-блоки</p>
        <Button onClick={openCreate} className="bg-yellow-500 text-black hover:bg-yellow-400">
          Новый баннер
        </Button>
      </div>
      <div className="space-y-3">
        {query.data.map((banner) => (
          <div key={banner.id} className="rounded-2xl border border-gray-900 bg-gray-950/70 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img src={banner.imageUrl} alt={banner.title} className="h-16 w-24 rounded-xl object-cover border border-gray-800" />
              <div>
                <p className="text-white font-semibold">{banner.title}</p>
                <p className="text-sm text-gray-400">{banner.subtitle}</p>
                <p className="text-xs text-gray-500">Порядок: {banner.displayOrder}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Switch checked={banner.isActive} onCheckedChange={(checked) => mutation.mutate({ id: banner.id, payload: { isActive: Boolean(checked) } })} />
                <span>{banner.isActive ? "Активен" : "Отключён"}</span>
              </div>
              <Button variant="outline" size="sm" className="border-gray-800 text-gray-100" onClick={() => openEdit(banner)}>
                Редактировать
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(banner.id)}>
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </div>
      <BannerDialog open={dialogOpen} onOpenChange={setDialogOpen} banner={editing} onSubmit={(payload) => mutation.mutate(payload)} loading={mutation.isPending} />
    </div>
  )
}

type BannerFormState = {
  imageUrl: string
  title: string
  subtitle: string
  buttonText: string
  buttonLink: string
  isActive: boolean
  displayOrder: string
}

const emptyBanner: BannerFormState = {
  imageUrl: "",
  title: "",
  subtitle: "",
  buttonText: "",
  buttonLink: "",
  isActive: true,
  displayOrder: "0",
}

function BannerDialog({ open, onOpenChange, banner, onSubmit, loading }: { open: boolean; onOpenChange: (value: boolean) => void; banner: Banner | null; onSubmit: (payload: { id?: string; payload: any }) => void; loading: boolean }) {
  const [form, setForm] = useState<BannerFormState>(emptyBanner)

  useEffect(() => {
    if (banner) {
      setForm({
        imageUrl: banner.imageUrl,
        title: banner.title,
        subtitle: banner.subtitle ?? "",
        buttonText: banner.buttonText ?? "",
        buttonLink: banner.buttonLink ?? "",
        isActive: banner.isActive,
        displayOrder: String(banner.displayOrder ?? 0),
      })
    } else {
      setForm(emptyBanner)
    }
  }, [banner])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      id: banner?.id,
      payload: {
        imageUrl: form.imageUrl,
        title: form.title,
        subtitle: form.subtitle || null,
        buttonText: form.buttonText || null,
        buttonLink: form.buttonLink || null,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder),
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 text-white border border-gray-800 max-w-xl">
        <DialogHeader>
          <DialogTitle>{banner ? "Редактировать баннер" : "Новый баннер"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Изображение (URL)</Label>
            <Input value={form.imageUrl} onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))} required className="bg-gray-900 border-gray-800" />
          </div>
          <div>
            <Label>Заголовок</Label>
            <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required className="bg-gray-900 border-gray-800" />
          </div>
          <div>
            <Label>Подзаголовок</Label>
            <Input value={form.subtitle} onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))} className="bg-gray-900 border-gray-800" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Текст кнопки</Label>
              <Input value={form.buttonText} onChange={(event) => setForm((prev) => ({ ...prev, buttonText: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <Label>Ссылка</Label>
              <Input value={form.buttonLink} onChange={(event) => setForm((prev) => ({ ...prev, buttonLink: event.target.value }))} className="bg-gray-900 border-gray-800" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: Boolean(checked) }))} />
            <span className="text-sm text-gray-300">Активировать баннер</span>
          </div>
          <div>
            <Label>Порядок</Label>
            <Input type="number" value={form.displayOrder} onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))} className="bg-gray-900 border-gray-800" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
