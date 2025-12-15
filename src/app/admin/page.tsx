import { Suspense } from 'react'
import Link from 'next/link'
import { DashboardStats } from '@/components/admin/DashboardStats'

export default function AdminDashboardPage() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-400'>Управление магазином</p>
          <h1 className='text-4xl font-bold'>Дашборд</h1>
        </div>
        <div className='flex gap-3'>
          <Link href='/admin/drops' className='bg-yellow-500 text-black px-4 py-2 rounded-lg font-medium'>
            Поставки
          </Link>
          <Link href='/admin/orders' className='border border-gray-700 px-4 py-2 rounded-lg'>
            Заказы
          </Link>
          <Link href='/admin/products' className='border border-gray-700 px-4 py-2 rounded-lg'>
            Каталог
          </Link>
          <Link href='/admin/waitlist' className='border border-gray-700 px-4 py-2 rounded-lg'>
            Waitlist
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className='text-gray-400'>Загружаем аналитику…</div>}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}
