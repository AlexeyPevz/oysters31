/**
 * Утилиты для работы с датами доставки
 */

/**
 * Получает доступные даты доставки на основе даты дропа
 * @param dropDate Дата поступления товара
 * @param daysAhead Количество дней вперед (по умолчанию 3)
 * @returns Массив доступных дат доставки
 */
export function getAvailableDeliveryDates(dropDate: Date | string, daysAhead = 3): Date[] {
  const dates: Date[] = []
  const start = new Date(dropDate)
  start.setDate(start.getDate() + 1) // Начинаем со следующего дня после дропа

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    dates.push(date)
  }

  return dates
}

/**
 * Форматирует дату для input[type="date"]
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}


