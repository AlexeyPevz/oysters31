import { db } from "@/lib/db"

export interface SiteSettings {
  siteName: string
  siteDescription: string
  contactPhone: string
  contactEmail: string
  address: string
  socialLinks: {
    telegram?: string
    whatsapp?: string
    instagram?: string
    vk?: string
  }
  heroText: {
    title: string
    subtitle: string
    buttonText: string
  }
  footerText: {
    copyright: string
    description: string
  }
  workingHours: {
    weekdays: string
    weekends: string
  }
}

const defaultSettings: SiteSettings = {
  siteName: "Oysters",
  siteDescription: "Свежие устрицы с доставкой",
  contactPhone: "+7 (999) 123-45-67",
  contactEmail: "info@oysters.ru",
  address: "Москва, ул. Примерная, 1",
  socialLinks: {
    telegram: "",
    whatsapp: "",
    instagram: "",
    vk: "",
  },
  heroText: {
    title: "Свежие устрицы с доставкой",
    subtitle: "Лучшие устрицы от проверенных поставщиков",
    buttonText: "Заказать",
  },
  footerText: {
    copyright: `© ${new Date().getFullYear()} Oysters. Все права защищены.`,
    description: "Доставка свежих устриц по Москве и области",
  },
  workingHours: {
    weekdays: "10:00 - 22:00",
    weekends: "11:00 - 21:00",
  },
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    const settings = await db.setting.findMany()
    
    if (settings.length === 0) {
      return defaultSettings
    }
    
    const settingsMap = settings.reduce((acc, setting) => {
      // Prisma Json type может вернуть уже распарсенный объект или строку
      let value = setting.value
      if (typeof value === 'string' && (setting.key === 'socialLinks' || setting.key === 'heroText' || setting.key === 'footerText' || setting.key === 'workingHours')) {
        try {
          value = JSON.parse(value)
        } catch {
          // Если не JSON, оставляем как есть
        }
      }
      acc[setting.key] = value
      return acc
    }, {} as Record<string, any>)
    
    return {
      siteName: settingsMap.siteName || defaultSettings.siteName,
      siteDescription: settingsMap.siteDescription || defaultSettings.siteDescription,
      contactPhone: settingsMap.contactPhone || defaultSettings.contactPhone,
      contactEmail: settingsMap.contactEmail || defaultSettings.contactEmail,
      address: settingsMap.address || defaultSettings.address,
      socialLinks: (settingsMap.socialLinks && typeof settingsMap.socialLinks === 'object') ? settingsMap.socialLinks : defaultSettings.socialLinks,
      heroText: (settingsMap.heroText && typeof settingsMap.heroText === 'object') ? settingsMap.heroText : defaultSettings.heroText,
      footerText: (settingsMap.footerText && typeof settingsMap.footerText === 'object') ? settingsMap.footerText : defaultSettings.footerText,
      workingHours: (settingsMap.workingHours && typeof settingsMap.workingHours === 'object') ? settingsMap.workingHours : defaultSettings.workingHours,
    }
  } catch (error) {
    console.error("Failed to fetch settings:", error)
    return defaultSettings
  }
}

export async function updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  try {
    const updatePromises = Object.entries(settings).map(([key, value]) => {
      return db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    })
    
    await Promise.all(updatePromises)
    
    return await getSettings()
  } catch (error) {
    console.error("Failed to update settings:", error)
    throw error
  }
}

export async function resetSettings(): Promise<SiteSettings> {
  try {
    await db.setting.deleteMany()
    
    const createPromises = Object.entries(defaultSettings).map(([key, value]) => {
      return db.setting.create({
        data: { key, value },
      })
    })
    
    await Promise.all(createPromises)
    
    return defaultSettings
  } catch (error) {
    console.error("Failed to reset settings:", error)
    throw error
  }
}
