import { addDays, format, setHours, setMinutes, isSameDay } from "date-fns"
import { ru } from "date-fns/locale"

export type TimeSlot = {
  id: string
  label: string
  startTime: string
  endTime: string
}

export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startHour = 9
  const endHour = 21

  for (let i = startHour; i < endHour; i++) {
    const startTime = `${i.toString().padStart(2, "0")}:00`
    const endTime = `${(i + 1).toString().padStart(2, "0")}:00`
    slots.push({
      id: `${startTime}-${endTime}`,
      label: `${startTime} - ${endTime}`,
      startTime,
      endTime,
    })
  }

  return slots
}

export function getDeliveryDates(supplyDate: Date | string): Date[] {
  const date = typeof supplyDate === "string" ? new Date(supplyDate) : supplyDate
  // Возвращаем дату поставки и следующие 2 дня
  return [date, addDays(date, 1), addDays(date, 2)]
}

export function formatDeliveryDate(date: Date): string {
  return format(date, "d MMMM (EEEE)", { locale: ru })
}
