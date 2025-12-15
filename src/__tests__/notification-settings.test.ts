import type { NotificationSettings } from "@/lib/validation/notification-config"
import { sanitizeNotificationSettings } from "@/lib/utils/notification-settings"

describe("sanitizeNotificationSettings", () => {
  it("removes empty values and fills defaults", () => {
    const input: NotificationSettings = {
      sms: { apiKey: " key ", apiUrl: "  ", senderId: "OYSTERS" },
      email: { smtpUrl: " smtps://user:pass@mail.ru ", from: " " },
      telegram: { botToken: "  ", chatId: "" },
      push: { publicKey: "abc", privateKey: "   " },
    }

    const result = sanitizeNotificationSettings(input)

    expect(result.sms).toEqual({ apiKey: "key", apiUrl: undefined, senderId: "OYSTERS" })
    expect(result.email).toEqual({ smtpUrl: "smtps://user:pass@mail.ru", from: "notifications@oysters.local" })
    expect(result.telegram).toBeUndefined()
    expect(result.push).toBeUndefined()
  })

  it("returns empty object when no channels configured", () => {
    const result = sanitizeNotificationSettings({})
    expect(result).toEqual({})
  })
})
