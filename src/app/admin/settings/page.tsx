import { getSettings } from "@/lib/services/settings"
import { SettingsForm } from "@/components/admin/SettingsForm"
import { BackButton } from "@/components/admin/BackButton"

export default async function AdminSettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Управление сайтом</p>
          <h1 className="text-4xl font-bold">Настройки</h1>
        </div>
        
        <BackButton href="/admin" />
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <SettingsForm initialData={settings} />
        </div>
      </div>
    </div>
  )
}
