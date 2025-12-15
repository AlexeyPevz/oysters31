"use client"

import { useEffect, useMemo, useState, type ComponentProps } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { NotificationSettings } from "@/lib/validation/notification-config"
import { sanitizeNotificationSettings } from "@/lib/utils/notification-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Непредвиденная ошибка")

type TestChannel = "sms" | "email" | "telegram" | "push"
type ChannelState = { state: "idle" | "pending" | "success" | "error"; message?: string; updatedAt?: number }

type TestLogEntry = {
  id: string
  channel: TestChannel
  status: "success" | "error"
  message: string
  timestamp: number
}

export type PushStats = {
  total: number
  items: Array<{
    id: string
    endpoint: string
    createdAt: string
    userId: string | null
    user: { id: string; name: string | null; phone: string | null } | null
  }>
}

async function fetchPushStats(): Promise<PushStats> {
  const response = await fetch("/api/admin/push/subscriptions", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Не удалось загрузить подписчиков")
  }
  return response.json()
}

async function sendPushBroadcast(payload: { title: string; body: string; url?: string }) {
  const response = await fetch("/api/admin/push/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка отправки" }))
    throw new Error(error.error ?? "Не удалось отправить push")
  }
  return response.json()
}

async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await fetch("/api/admin/settings/notifications", { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Не удалось загрузить настройки уведомлений")
  }
  return response.json()
}

async function persistNotificationSettings(payload: NotificationSettings) {
  const response = await fetch("/api/admin/settings/notifications", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Ошибка сохранения" }))
    throw new Error(error.error ?? "Не удалось сохранить настройки")
  }
  return response.json()
}

const initialBroadcast = {
  title: "Новое поступление",
  body: "Тестовое уведомление. Канал активен.",
  url: "https://oysters.example/catalog",
}

const emptyChannelState: ChannelState = { state: "idle" }

export function NotificationsConsole({ initialPushStats, initialSettings }: { initialPushStats: PushStats; initialSettings: NotificationSettings }) {
  const queryClient = useQueryClient()
  const [broadcastForm, setBroadcastForm] = useState(initialBroadcast)
  const [settingsDraft, setSettingsDraft] = useState<NotificationSettings>(initialSettings)
  const [testTargets, setTestTargets] = useState({
    smsPhone: initialSettings.test?.smsPhone ?? "",
    email: initialSettings.test?.email ?? "",
    telegramChatId: initialSettings.test?.telegramChatId ?? "",
    pushSubscriptionId: "",
  })
  const [channelStatus, setChannelStatus] = useState<Record<TestChannel, ChannelState>>({
    sms: emptyChannelState,
    email: emptyChannelState,
    telegram: emptyChannelState,
    push: emptyChannelState,
  })
  const [testLog, setTestLog] = useState<TestLogEntry[]>([])

  const pushQuery = useQuery({ queryKey: ["admin-push"], queryFn: fetchPushStats, initialData: initialPushStats, refetchInterval: 30000 })
  const settingsQuery = useQuery({ queryKey: ["admin-notification-settings"], queryFn: fetchNotificationSettings, initialData: initialSettings })

  useEffect(() => {
    setSettingsDraft(settingsQuery.data)
    setTestTargets((prev) => ({
      smsPhone: prev.smsPhone || settingsQuery.data.test?.smsPhone || "",
      email: prev.email || settingsQuery.data.test?.email || "",
      telegramChatId: prev.telegramChatId || settingsQuery.data.test?.telegramChatId || "",
      pushSubscriptionId: prev.pushSubscriptionId,
    }))
  }, [settingsQuery.data])

  const pushMutation = useMutation({
    mutationFn: sendPushBroadcast,
    onSuccess: () => {
      toast.success("Push отправлен")
      queryClient.invalidateQueries({ queryKey: ["admin-push"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const settingsMutation = useMutation({
    mutationFn: persistNotificationSettings,
    onSuccess: (data) => {
      toast.success("Настройки сохранены")
      queryClient.invalidateQueries({ queryKey: ["admin-notification-settings"] })
      setSettingsDraft(data)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const channelCards = useMemo(
    () => [
      { key: "sms" as TestChannel, label: "SMS", enabled: Boolean(settingsDraft.sms?.apiKey) },
      { key: "email" as TestChannel, label: "E-mail", enabled: Boolean(settingsDraft.email?.smtpUrl) },
      { key: "telegram" as TestChannel, label: "Telegram", enabled: Boolean(settingsDraft.telegram?.botToken) },
      { key: "push" as TestChannel, label: "Web Push", enabled: Boolean(settingsDraft.push?.publicKey) },
    ],
    [settingsDraft.sms, settingsDraft.email, settingsDraft.telegram, settingsDraft.push]
  )

  const pushTargets = pushQuery.data.items.map((item) => ({
    value: item.id,
    label: item.user?.name || item.user?.phone || item.endpoint,
    helper: new Date(item.createdAt).toLocaleString("ru-RU"),
  }))

  const handleTestChange = (field: keyof typeof testTargets, value: string) => {
    setTestTargets((prev) => ({ ...prev, [field]: value }))
  }

  const appendLog = (entry: Omit<TestLogEntry, "id" | "timestamp">) => {
    const next: TestLogEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      timestamp: Date.now(),
      ...entry,
    }
    setTestLog((prev) => [next, ...prev].slice(0, 12))
  }

  const runTest = async (channel: TestChannel) => {
    const ensureEnabled = () => {
      switch (channel) {
        case "sms":
          return settingsDraft.sms?.apiKey
        case "email":
          return settingsDraft.email?.smtpUrl
        case "telegram":
          return settingsDraft.telegram?.botToken
        case "push":
          return settingsDraft.push?.publicKey
      }
    }
    if (!ensureEnabled()) {
      toast.error("Канал ещё не настроен")
      return
    }

    const targetPayload: Record<string, string | undefined> = {}
    if (channel === "sms") targetPayload.phone = testTargets.smsPhone || settingsDraft.test?.smsPhone
    if (channel === "email") targetPayload.email = testTargets.email || settingsDraft.test?.email
    if (channel === "telegram") targetPayload.telegramChatId = testTargets.telegramChatId || settingsDraft.test?.telegramChatId
    if (channel === "push") targetPayload.pushSubscriptionId = testTargets.pushSubscriptionId || undefined

    if (channel === "sms" || channel === "email" || channel === "telegram") {
      const fieldKey = CHANNEL_INPUT_MAP[channel]
      if (!targetPayload[fieldKey]) {
        toast.error("Заполните поле для тестового получателя")
        return
      }
    }

    setChannelStatus((prev) => ({ ...prev, [channel]: { state: "pending" } }))
    try {
      const response = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, target: targetPayload }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error ?? "Не удалось выполнить тест")
      }
      appendLog({ channel, status: "success", message: data.message ?? "Тест пройден" })
      setChannelStatus((prev) => ({ ...prev, [channel]: { state: "success", message: data.message, updatedAt: Date.now() } }))
      toast.success(data.message ?? "Канал работает")
    } catch (error) {
      const message = getErrorMessage(error)
      appendLog({ channel, status: "error", message })
      setChannelStatus((prev) => ({ ...prev, [channel]: { state: "error", message, updatedAt: Date.now() } }))
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-4">
        {channelCards.map((channel) => (
          <div key={channel.key} className="rounded-2xl border border-gray-900 bg-gray-950/70 p-4">
            <p className="text-sm text-gray-400">Канал</p>
            <p className="text-xl font-semibold text-white">{channel.label}</p>
            <p className={channel.enabled ? "text-emerald-400 text-sm" : "text-amber-300 text-sm"}>{channel.enabled ? "активен" : "не настроен"}</p>
            {channelStatus[channel.key].updatedAt ? (
              <p className="mt-2 text-xs text-gray-500">
                {channelStatus[channel.key].state === "success" ? "Успешный тест" : channelStatus[channel.key].state === "error" ? "Ошибка" : ""} · {new Date(channelStatus[channel.key].updatedAt!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <TestDeliveryPanel
        channelStatus={channelStatus}
        onRunTest={runTest}
        targets={testTargets}
        onChangeTarget={handleTestChange}
        pushTargets={pushTargets}
        log={testLog}
      />

      <section className="rounded-2xl border border-gray-900 bg-gray-950/80 p-5">
        <div className="mb-4">
          <p className="text-sm text-gray-400">Массовая рассылка</p>
          <h3 className="text-2xl font-semibold text-white">Push broadcast</h3>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            pushMutation.mutate(broadcastForm)
          }}
        >
          <LabeledInput label="Заголовок" required value={broadcastForm.title} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, title: event.target.value }))} />
          <LabeledInput label="Ссылка (опционально)" value={broadcastForm.url} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, url: event.target.value }))} placeholder="https://" />
          <LabeledTextarea label="Текст" rows={3} required value={broadcastForm.body} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, body: event.target.value }))} />
          <Button type="submit" disabled={pushMutation.isPending} className="bg-yellow-500 text-black hover:bg-yellow-400">
            {pushMutation.isPending ? "Отправляем..." : "Отправить push"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-900 bg-gray-950/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Подписчики</p>
            <h3 className="text-2xl font-semibold text-white">{pushQuery.data.total} устройств</h3>
          </div>
          <Button variant="outline" size="sm" className="border-gray-800" onClick={() => pushQuery.refetch()}>
            Обновить
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {pushQuery.data.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-900 bg-black/40 p-3 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <p>{item.user?.name ?? "Гость"}</p>
                <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <p className="text-xs text-gray-500">{item.user?.phone ?? item.endpoint}</p>
            </div>
          ))}
          {pushQuery.data.items.length === 0 && <p className="text-sm text-gray-500">Подписок пока нет — попросите пользователей разрешить push при следующем заходе.</p>}
        </div>
      </section>

      <NotificationSettingsForm value={settingsDraft} onChange={setSettingsDraft} loading={settingsMutation.isPending} onSubmit={() => settingsMutation.mutate(sanitizeNotificationSettings(settingsDraft))} />
    </div>
  )
}

const CHANNEL_INPUT_MAP: Record<Exclude<TestChannel, "push">, string> = {
  sms: "phone",
  email: "email",
  telegram: "telegramChatId",
}

type SettingsFormProps = {
  value: NotificationSettings
  onChange: (value: NotificationSettings) => void
  loading: boolean
  onSubmit: () => void
}

function NotificationSettingsForm({ value, onChange, loading, onSubmit }: SettingsFormProps) {
  const toggleChannel = (channel: keyof NotificationSettings, enabled: boolean) => {
    if (!enabled) {
      onChange({ ...value, [channel]: undefined })
      return
    }
    switch (channel) {
      case "sms":
        onChange({ ...value, sms: value.sms ?? { apiKey: "", apiUrl: "", senderId: "" } })
        break
      case "email":
        onChange({ ...value, email: value.email ?? { smtpUrl: "", from: "" } })
        break
      case "telegram":
        onChange({ ...value, telegram: value.telegram ?? { botToken: "", chatId: "" } })
        break
      case "push":
        onChange({ ...value, push: value.push ?? { publicKey: "", privateKey: "" } })
        break
      default:
        break
    }
  }

  const updateField = <K extends keyof NotificationSettings, F extends keyof NonNullable<NotificationSettings[K]>>(
    channel: K,
    field: F,
    nextValue: string,
  ) => {
    onChange({
      ...value,
      [channel]: {
        ...(value[channel] ?? ({} as NonNullable<NotificationSettings[K]>)),
        [field]: nextValue,
      },
    })
  }

  const updateTestField = (field: keyof NonNullable<NotificationSettings["test"]>, nextValue: string) => {
    onChange({
      ...value,
      test: {
        ...(value.test ?? {}),
        [field]: nextValue,
      },
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ChannelSection
        title="SMS"
        description="Провайдер и отправитель"
        enabled={Boolean(value.sms)}
        onToggle={(checked) => toggleChannel("sms", Boolean(checked))}
      >
        <LabeledInput label="API Key" placeholder="ключ" value={value.sms?.apiKey ?? ""} onChange={(event) => updateField("sms", "apiKey", event.target.value)} />
        <LabeledInput label="API URL" placeholder="https://..." value={value.sms?.apiUrl ?? ""} onChange={(event) => updateField("sms", "apiUrl", event.target.value)} />
        <LabeledInput label="Sender ID" placeholder="OYSTERS" value={value.sms?.senderId ?? ""} onChange={(event) => updateField("sms", "senderId", event.target.value)} />
      </ChannelSection>

      <ChannelSection
        title="E-mail"
        description="SMTP соединение"
        enabled={Boolean(value.email)}
        onToggle={(checked) => toggleChannel("email", Boolean(checked))}
      >
        <LabeledInput label="SMTP URL" placeholder="smtps://user:pass@mail.ru" value={value.email?.smtpUrl ?? ""} onChange={(event) => updateField("email", "smtpUrl", event.target.value)} />
        <LabeledInput label="Отправитель" placeholder="notifications@oysters.ru" value={value.email?.from ?? ""} onChange={(event) => updateField("email", "from", event.target.value)} />
      </ChannelSection>

      <ChannelSection
        title="Telegram"
        description="Бот и чат"
        enabled={Boolean(value.telegram)}
        onToggle={(checked) => toggleChannel("telegram", Boolean(checked))}
      >
        <LabeledInput label="Bot token" placeholder="000000:ABC..." value={value.telegram?.botToken ?? ""} onChange={(event) => updateField("telegram", "botToken", event.target.value)} />
        <LabeledInput label="Chat ID" placeholder="@oysters_channel" value={value.telegram?.chatId ?? ""} onChange={(event) => updateField("telegram", "chatId", event.target.value)} />
      </ChannelSection>

      <ChannelSection
        title="Web Push"
        description="VAPID ключи"
        enabled={Boolean(value.push)}
        onToggle={(checked) => toggleChannel("push", Boolean(checked))}
      >
        <LabeledInput label="Public key" placeholder="BLa..." value={value.push?.publicKey ?? ""} onChange={(event) => updateField("push", "publicKey", event.target.value)} />
        <LabeledTextarea label="Private key" rows={2} placeholder="hJf..." value={value.push?.privateKey ?? ""} onChange={(event) => updateField("push", "privateKey", event.target.value)} />
        <small className="text-xs text-gray-500">Сгенерируйте пары командой `npm run push:vapid`.</small>
      </ChannelSection>

      <div className="rounded-2xl border border-gray-900 bg-black/30 p-4 space-y-4">
        <div>
          <p className="text-white font-semibold">Тестовые контакты</p>
          <p className="text-sm text-gray-400">Используются по умолчанию при проверке каналов</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledInput label="SMS" placeholder="+79990000000" value={value.test?.smsPhone ?? ""} onChange={(event) => updateTestField("smsPhone", event.target.value)} />
          <LabeledInput label="E-mail" placeholder="qa@oysters.local" value={value.test?.email ?? ""} onChange={(event) => updateTestField("email", event.target.value)} />
          <LabeledInput label="Telegram chat" placeholder="@oysters_test" value={value.test?.telegramChatId ?? ""} onChange={(event) => updateTestField("telegramChatId", event.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="bg-yellow-500 text-black hover:bg-yellow-400">
          {loading ? "Сохраняем..." : "Сохранить"}
        </Button>
      </div>
    </form>
  )
}

const statusTone: Record<ChannelState["state"], string> = {
  idle: "bg-gray-900 text-gray-400",
  pending: "bg-amber-500/20 text-amber-400",
  success: "bg-emerald-500/20 text-emerald-300",
  error: "bg-rose-500/20 text-rose-300",
}

type TestPanelProps = {
  channelStatus: Record<TestChannel, ChannelState>
  onRunTest: (channel: TestChannel) => void
  targets: { smsPhone: string; email: string; telegramChatId: string; pushSubscriptionId: string }
  onChangeTarget: (field: keyof TestPanelProps["targets"], value: string) => void
  pushTargets: Array<{ value: string; label: string; helper: string }>
  log: TestLogEntry[]
}

function TestDeliveryPanel({ channelStatus, onRunTest, targets, onChangeTarget, pushTargets, log }: TestPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-900 bg-gray-950/80 p-5 space-y-6">
      <div>
        <p className="text-sm text-gray-400">Тестирование</p>
        <h3 className="text-2xl font-semibold text-white">Проверка каналов</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TestCard
          title="SMS"
          description="Отправляет короткое сообщение на указанный номер"
          status={channelStatus.sms}
          actionLabel="Отправить SMS"
          onTest={() => onRunTest("sms")}
        >
          <Input placeholder="+7999..." value={targets.smsPhone} onChange={(event) => onChangeTarget("smsPhone", event.target.value)} className="bg-gray-900 border-gray-800" />
        </TestCard>
        <TestCard
          title="E-mail"
          description="Письмо с подтверждением настройки SMTP"
          status={channelStatus.email}
          actionLabel="Отправить письмо"
          onTest={() => onRunTest("email")}
        >
          <Input placeholder="qa@oysters.local" value={targets.email} onChange={(event) => onChangeTarget("email", event.target.value)} className="bg-gray-900 border-gray-800" />
        </TestCard>
        <TestCard
          title="Telegram"
          description="Сообщение в указанный чат"
          status={channelStatus.telegram}
          actionLabel="Отправить в Telegram"
          onTest={() => onRunTest("telegram")}
        >
          <Input placeholder="@oysters_test" value={targets.telegramChatId} onChange={(event) => onChangeTarget("telegramChatId", event.target.value)} className="bg-gray-900 border-gray-800" />
        </TestCard>
        <TestCard
          title="Web Push"
          description="Push-уведомление в выбранную подписку"
          status={channelStatus.push}
          actionLabel="Отправить push"
          onTest={() => onRunTest("push")}
        >
          {pushTargets.length ? (
            <Select value={targets.pushSubscriptionId} onValueChange={(value) => onChangeTarget("pushSubscriptionId", value)}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-left">
                <SelectValue placeholder="Выберите подписку" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                {pushTargets.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-sm">
                    <div>
                      <p>{option.label}</p>
                      <p className="text-xs text-gray-500">{option.helper}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-500">Нет подписчиков — тест отправится на ближайшую новую подписку.</p>
          )}
        </TestCard>
      </div>

      <div>
        <p className="text-sm text-gray-400">Журнал тестов</p>
        {log.length === 0 ? (
          <p className="text-sm text-gray-500">Запустите проверку, чтобы увидеть результат.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {log.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-900 bg-black/30 p-3 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={statusTone[entry.status === "success" ? "success" : "error"]}>{entry.channel.toUpperCase()}</Badge>
                    <span>{entry.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

type TestCardProps = {
  title: string
  description: string
  status: ChannelState
  actionLabel: string
  onTest: () => void
  children: React.ReactNode
}

function TestCard({ title, description, status, actionLabel, onTest, children }: TestCardProps) {
  const tone = statusTone[status.state]
  return (
    <div className="rounded-2xl border border-gray-900 bg-black/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">{title}</p>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <Badge className={tone}>
          {status.state === "idle" ? "—" : status.state === "pending" ? "ожидание" : status.state === "success" ? "ok" : "ошибка"}
        </Badge>
      </div>
      {children}
      <Button type="button" onClick={onTest} className="w-full bg-yellow-500 text-black hover:bg-yellow-400">
        {actionLabel}
      </Button>
    </div>
  )
}

type ChannelSectionProps = {
  title: string
  description: string
  enabled: boolean
  onToggle: (checked: boolean) => void
  children: React.ReactNode
}

function ChannelSection({ title, description, enabled, onToggle, children }: ChannelSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-900 bg-black/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">{title}</p>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{enabled ? "включён" : "выключен"}</span>
          <Switch checked={enabled} onCheckedChange={(checked) => onToggle(Boolean(checked))} />
        </div>
      </div>
      {enabled ? <div className="grid gap-3 md:grid-cols-2">{children}</div> : <p className="text-xs text-gray-500">Активируйте переключатель, чтобы заполнить данные.</p>}
    </div>
  )
}

type LabeledInputProps = ComponentProps<typeof Input> & { label: string }
function LabeledInput({ label, ...props }: LabeledInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-400">{label}</label>
      <Input className="bg-gray-900 border-gray-800" {...props} />
    </div>
  )
}

type LabeledTextareaProps = ComponentProps<typeof Textarea> & { label: string }
function LabeledTextarea({ label, ...props }: LabeledTextareaProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-400">{label}</label>
      <Textarea className="bg-gray-900 border-gray-800" {...props} />
    </div>
  )
}
