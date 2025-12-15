/**
 * Утилиты для работы с часовыми тайм-слотами доставки
 */

export type HourlySlot = {
  id: string
  label: string
  start: string // HH:mm
  end: string // HH:mm
}

/**
 * Генерирует часовые слоты для доставки
 * @param startHour Час начала (0-23)
 * @param endHour Час окончания (0-23)
 * @returns Массив часовых слотов
 */
export function generateHourlySlots(startHour = 8, endHour = 22): HourlySlot[] {
  const slots: HourlySlot[] = []

  for (let hour = startHour; hour < endHour; hour++) {
    const start = `${String(hour).padStart(2, "0")}:00`
    const end = `${String(hour + 1).padStart(2, "0")}:00`
    slots.push({
      id: `${start}-${end}`,
      label: `${start} - ${end}`,
      start,
      end,
    })
  }

  return slots
}

/**
 * Получает часовые слоты для конкретного дня
 * Исключает прошедшие слоты для текущего дня
 */
export function getAvailableHourlySlots(date: Date | string, startHour = 8, endHour = 22): HourlySlot[] {
  const allSlots = generateHourlySlots(startHour, endHour)
  const selectedDate = typeof date === "string" ? new Date(date) : date
  const now = new Date()

  // Если выбран сегодня, фильтруем прошедшие слоты
  if (
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear()
  ) {
    const currentHour = now.getHours()
    return allSlots.filter((slot) => {
      const slotHour = parseInt(slot.start.split(":")[0])
      return slotHour > currentHour
    })
  }

  return allSlots
}

/**
 * Конвертирует старый DeliverySlot в часовой слот (для обратной совместимости)
 */
export function convertLegacySlotToHourly(slot: "MORNING" | "DAY" | "EVENING"): HourlySlot {
  const mapping: Record<string, HourlySlot> = {
    MORNING: { id: "09:00-12:00", label: "09:00 - 12:00", start: "09:00", end: "12:00" },
    DAY: { id: "12:00-17:00", label: "12:00 - 17:00", start: "12:00", end: "17:00" },
    EVENING: { id: "17:00-22:00", label: "17:00 - 22:00", start: "17:00", end: "22:00" },
  }
  return mapping[slot] || mapping.DAY
}


