import { listPushSubscriptions } from "@/lib/services/push"
import { loadNotificationSettings } from "@/lib/services/notification-config"
import { NotificationsConsole } from "@/components/admin/NotificationsConsole"

export default async function AdminNotificationsPage() {
  const [pushStats, settings] = await Promise.all([listPushSubscriptions(), loadNotificationSettings(true)])
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-gray-400">Оповещения клиентов и команды</p>
        <h1 className="text-4xl font-bold">Уведомления</h1>
      </div>
      <NotificationsConsole initialPushStats={pushStats} initialSettings={settings} />
    </div>
  )
}
