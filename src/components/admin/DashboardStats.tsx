"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, Eye } from "lucide-react"

type DashboardMetrics = {
    supply: {
        totalSupplies: number
        totalProducts: number
        totalAvailable: number
        totalReserved: number
        supplies: Array<{
            id: string
            name: string
            supplyDate: Date
            itemCount: number
            waitlistCount: number
            totalQty: number
            reservedQty: number
        }>
    }
    waitlist: {
        totalEntries: number
        totalQuantity: number
        potentialRevenue: number
        bySupply: Array<{
            supplyId: string
            supplyName: string
            count: number
            quantity: number
        }>
        topProducts: Array<{
            productId: string
            productName: string
            count: number
            quantity: number
        }>
    }
    visitors: {
        period: string
        totalViews: number
        uniqueVisitors: number
        topPages: Array<{ path: string; count: number }>
        dailyViews: Array<{ date: string; count: number }>
    }
    general: {
        totalProducts: number
        totalOrders: number
        totalClients: number
    }
}

export function DashboardStats() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMetrics()
        // Refresh every 5 minutes
        const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const fetchMetrics = async () => {
        try {
            const response = await fetch("/api/admin/analytics/dashboard")
            if (response.ok) {
                const data = await response.json()
                setMetrics(data)
            }
        } catch (error) {
            console.error("Failed to fetch metrics:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="text-gray-400">Загрузка аналитики...</div>
    }

    if (!metrics) {
        return <div className="text-red-400">Не удалось загрузить метрики</div>
    }

    return (
        <div className="space-y-6">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Посетители сегодня"
                    value={metrics.visitors.uniqueVisitors}
                    icon={<Eye className="h-5 w-5" />}
                    subtitle={`${metrics.visitors.totalViews} просмотров`}
                />
                <StatCard
                    title="Активные поставки"
                    value={metrics.supply.totalSupplies}
                    icon={<Package className="h-5 w-5" />}
                    subtitle={`${metrics.supply.totalProducts} товаров`}
                />
                <StatCard
                    title="Предзаказы"
                    value={metrics.waitlist.totalEntries}
                    icon={<ShoppingCart className="h-5 w-5" />}
                    subtitle={`${metrics.waitlist.totalQuantity} шт`}
                />
                <StatCard
                    title="Потенциальная выручка"
                    value={`${Math.round(metrics.waitlist.potentialRevenue).toLocaleString()} ₽`}
                    icon={<DollarSign className="h-5 w-5" />}
                    subtitle="По предзаказам"
                />
            </div>

            {/* Supply Metrics */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Метрики по поставкам
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div>
                            <p className="text-sm text-gray-400">Всего товаров</p>
                            <p className="text-2xl font-bold">{metrics.supply.totalProducts}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Доступно</p>
                            <p className="text-2xl font-bold text-green-400">{metrics.supply.totalAvailable}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Зарезервировано</p>
                            <p className="text-2xl font-bold text-yellow-400">{metrics.supply.totalReserved}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">% Резерва</p>
                            <p className="text-2xl font-bold">
                                {Math.round((metrics.supply.totalReserved / (metrics.supply.totalAvailable + metrics.supply.totalReserved)) * 100)}%
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-semibold mb-2">По поставкам:</h4>
                        {metrics.supply.supplies.map((supply) => (
                            <div key={supply.id} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                <div>
                                    <p className="font-medium">{supply.name}</p>
                                    <p className="text-sm text-gray-400">
                                        {supply.itemCount} товаров • {supply.waitlistCount} записей
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">
                                        <span className="text-green-400">{supply.totalQty - supply.reservedQty}</span>
                                        {" / "}
                                        <span className="text-yellow-400">{supply.reservedQty}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Waitlist Analytics */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Аналитика предзаказов
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">По поставкам:</h4>
                            <div className="space-y-2">
                                {metrics.waitlist.bySupply.map((item) => (
                                    <div key={item.supplyId} className="flex justify-between p-2 bg-gray-800/30 rounded">
                                        <span className="text-sm">{item.supplyName}</span>
                                        <span className="font-medium">{item.count} ({item.quantity} шт)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Топ товаров:</h4>
                            <div className="space-y-2">
                                {metrics.waitlist.topProducts.slice(0, 5).map((item, idx) => (
                                    <div key={item.productId} className="flex justify-between p-2 bg-gray-800/30 rounded">
                                        <span className="text-sm">
                                            {idx + 1}. {item.productName}
                                        </span>
                                        <span className="font-medium">{item.quantity} шт</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Visitor Stats */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Статистика посещений
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">Популярные страницы:</h4>
                            <div className="space-y-2">
                                {metrics.visitors.topPages.slice(0, 5).map((page) => (
                                    <div key={page.path} className="flex justify-between p-2 bg-gray-800/30 rounded">
                                        <span className="text-sm truncate">{page.path}</span>
                                        <span className="font-medium">{page.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">По дням:</h4>
                            <div className="space-y-2">
                                {metrics.visitors.dailyViews.slice(-7).map((day) => (
                                    <div key={day.date} className="flex justify-between p-2 bg-gray-800/30 rounded">
                                        <span className="text-sm">{new Date(day.date).toLocaleDateString("ru-RU")}</span>
                                        <span className="font-medium">{day.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function StatCard({ title, value, icon, subtitle }: { title: string; value: string | number; icon: React.ReactNode; subtitle?: string }) {
    return (
        <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">{title}</p>
                    <div className="text-yellow-500">{icon}</div>
                </div>
                <p className="text-3xl font-bold mb-1">{value}</p>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </CardContent>
        </Card>
    )
}
