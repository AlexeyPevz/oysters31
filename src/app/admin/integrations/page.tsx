import { IntegrationsForm } from "@/components/admin/IntegrationsForm"
import { BackButton } from "@/components/admin/BackButton"

export default function AdminIntegrationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Интеграции</p>
          <h1 className="text-4xl font-bold">API и сервисы</h1>
        </div>
        
        <BackButton href="/admin" />
      </div>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <IntegrationsForm />
        </div>
      </div>
    </div>
  )
}
