import { db } from "@/lib/db"

export async function trackPageView(path: string, userAgent?: string, ip?: string) {
    try {
        await db.pageView.create({
            data: {
                path,
                userAgent,
                ip,
            },
        })
    } catch (error) {
        console.error("Failed to track page view:", error)
    }
}

export async function getDashboardMetrics() {
    const [
        supplyMetrics,
        waitlistMetrics,
        visitorMetrics,
        generalMetrics,
    ] = await Promise.all([
        getSupplyMetrics(),
        getWaitlistMetrics(),
        getVisitorStats("today"),
        getGeneralMetrics(),
    ])

    return {
        supply: supplyMetrics,
        waitlist: waitlistMetrics,
        visitors: visitorMetrics,
        general: generalMetrics,
    }
}

export async function getSupplyMetrics() {
    const supplies = await db.supply.findMany({
        where: { isActive: true },
        include: {
            items: true,
            _count: {
                select: { waitlist: true },
            },
        },
    })

    const totalSupplies = supplies.length
    const totalProducts = supplies.reduce((sum, s) => sum + s.items.length, 0)
    const totalQuantity = supplies.reduce(
        (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
    )
    const totalReserved = supplies.reduce(
        (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.reservedQty, 0),
        0
    )
    const totalAvailable = totalQuantity - totalReserved

    return {
        totalSupplies,
        totalProducts,
        totalQuantity,
        totalReserved,
        totalAvailable,
        supplies: supplies.map((s) => ({
            id: s.id,
            name: s.name,
            supplyDate: s.supplyDate,
            itemCount: s.items.length,
            waitlistCount: s._count.waitlist,
            totalQty: s.items.reduce((sum, item) => sum + item.quantity, 0),
            reservedQty: s.items.reduce((sum, item) => sum + item.reservedQty, 0),
        })),
    }
}

export async function getWaitlistMetrics() {
    const waitlistEntries = await db.supplyWaitlist.findMany({
        include: {
            supply: true,
            product: true,
        },
    })

    const totalEntries = waitlistEntries.length
    const totalQuantity = waitlistEntries.reduce((sum, entry) => sum + entry.quantity, 0)

    // Group by supply
    const bySupply = waitlistEntries.reduce((acc, entry) => {
        const key = entry.supplyId
        if (!acc[key]) {
            acc[key] = {
                supplyId: entry.supplyId,
                supplyName: entry.supply.name,
                count: 0,
                quantity: 0,
            }
        }
        acc[key].count++
        acc[key].quantity += entry.quantity
        return acc
    }, {} as Record<string, any>)

    // Group by product
    const byProduct = waitlistEntries.reduce((acc, entry) => {
        const key = entry.productId
        if (!acc[key]) {
            acc[key] = {
                productId: entry.productId,
                productName: entry.product.name,
                count: 0,
                quantity: 0,
            }
        }
        acc[key].count++
        acc[key].quantity += entry.quantity
        return acc
    }, {} as Record<string, any>)

    // Calculate potential revenue
    const potentialRevenue = await db.supplyWaitlist.findMany({
        include: {
            product: true,
        },
    }).then((entries) =>
        entries.reduce((sum, entry) => {
            const price = Number(entry.product.price) // Convert Decimal to number
            return sum + price * entry.quantity
        }, 0)
    )

    return {
        totalEntries,
        totalQuantity,
        potentialRevenue,
        bySupply: Object.values(bySupply),
        topProducts: Object.values(byProduct)
            .sort((a: any, b: any) => b.quantity - a.quantity)
            .slice(0, 10),
    }
}

export async function getVisitorStats(period: "today" | "week" | "month" = "today") {
    const now = new Date()
    let startDate: Date

    switch (period) {
        case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0))
            break
        case "week":
            startDate = new Date(now.setDate(now.getDate() - 7))
            break
        case "month":
            startDate = new Date(now.setDate(now.getDate() - 30))
            break
    }

    const pageViews = await db.pageView.findMany({
        where: {
            createdAt: {
                gte: startDate,
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    })

    const totalViews = pageViews.length
    const uniqueIps = new Set(pageViews.filter((pv) => pv.ip).map((pv) => pv.ip)).size

    // Group by path
    const byPath = pageViews.reduce((acc, pv) => {
        if (!acc[pv.path]) {
            acc[pv.path] = 0
        }
        acc[pv.path]++
        return acc
    }, {} as Record<string, number>)

    const topPages = Object.entries(byPath)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }))

    // Group by day for chart
    const byDay = pageViews.reduce((acc, pv) => {
        const day = pv.createdAt.toISOString().split("T")[0]
        if (!acc[day]) {
            acc[day] = 0
        }
        acc[day]++
        return acc
    }, {} as Record<string, number>)

    return {
        period,
        totalViews,
        uniqueVisitors: uniqueIps,
        topPages,
        dailyViews: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    }
}

export async function getGeneralMetrics() {
    const [totalProducts, totalOrders, totalClients] = await Promise.all([
        db.product.count(),
        db.order.count(),
        db.user.count({ where: { role: "CLIENT" } }),
    ])

    return {
        totalProducts,
        totalOrders,
        totalClients,
    }
}
