'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CatalogFilterValues = {
  category: string
  status: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  search: string
}

interface Props {
  categories: { value: string; label: string }[]
  statuses: { value: string; label: string }[]
  initialValues: CatalogFilterValues
}

export function CatalogFilters({ categories, statuses, initialValues }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [filters, setFilters] = useState(initialValues)

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    startTransition(() => {
      router.replace(`/catalog?${params.toString()}`)
    })
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 lg:p-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Категория</p>
          <Select value={filters.category} onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value} className="text-white">
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Статус</p>
          <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value} className="text-white">
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Сортировка</p>
          <Select value={`${filters.sortBy}:${filters.sortOrder}`} onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split(':')
            setFilters((prev) => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }))
          }}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-white">
              <SelectItem value="displayOrder:asc">Сначала рекомендуемые</SelectItem>
              <SelectItem value="price:asc">По цене (возр.)</SelectItem>
              <SelectItem value="price:desc">По цене (убыв.)</SelectItem>
              <SelectItem value="createdAt:desc">Сначала новые</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Поиск</p>
          <Input
            placeholder="Название или описание"
            className="bg-gray-800 border-gray-700 text-white"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={applyFilters} disabled={pending} className={cn('bg-yellow-500 text-black hover:bg-yellow-400', pending && 'opacity-70')}>
          Показать результаты
        </Button>
      </div>
    </div>
  )
}
