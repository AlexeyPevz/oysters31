import { db } from '../src/lib/db'
import { ProductStatus } from '@prisma/client'

/**
 * Migration script to convert oyster products with size numbers to variants
 * 
 * Example:
 * Before:
 *   - Устрица Хасанская №1 (450₽)
 *   - Устрица Хасанская №2 (500₽)
 *   - Устрица Хасанская №3 (550₽)
 * 
 * After:
 *   - Устрица Хасанская (parent product, hasVariants=true)
 *     - Variant №1 (450₽)
 *     - Variant №2 (500₽)
 *     - Variant №3 (550₽)
 */

async function migrateOystersToVariants(dryRun = true) {
    console.log(`\n🦪 Oyster Migration Script ${dryRun ? '(DRY RUN)' : '(LIVE)'}\n`)

    try {
        // 1. Find all oyster products with size numbers
        const oysters = await db.product.findMany({
            where: {
                category: 'OYSTERS',
                name: { contains: '№' }
            },
            orderBy: { name: 'asc' }
        })

        console.log(`Found ${oysters.length} oyster products with size numbers\n`)

        // 2. Group by base name (without size)
        const groups = new Map<string, typeof oysters>()

        for (const oyster of oysters) {
            // Extract base name: "Устрица Хасанская №1" -> "Устрица Хасанская"
            const baseName = oyster.name.replace(/\s*№\d+.*$/, '').trim()

            if (!groups.has(baseName)) {
                groups.set(baseName, [])
            }
            groups.get(baseName)!.push(oyster)
        }

        console.log(`Grouped into ${groups.size} product families:\n`)

        // 3. For each group, create parent product and variants
        for (const [baseName, products] of groups) {
            console.log(`📦 ${baseName}`)
            console.log(`   Products to migrate: ${products.length}`)

            products.forEach(p => {
                console.log(`   - ${p.name} (${Number(p.price)}₽, ${p.status})`)
            })

            if (!dryRun) {
                // Check if parent already exists
                const existingParent = await db.product.findFirst({
                    where: {
                        name: baseName,
                        hasVariants: true
                    }
                })

                let parentId: string

                if (existingParent) {
                    console.log(`   ✓ Parent product already exists: ${existingParent.id}`)
                    parentId = existingParent.id
                } else {
                    // Create parent product
                    const parent = await db.product.create({
                        data: {
                            name: baseName,
                            slug: `${baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-variants`,
                            category: 'OYSTERS',
                            price: products[0].price, // Use first variant price as default
                            unit: products[0].unit,
                            shortDescription: products[0].shortDescription,
                            fullDescription: products[0].fullDescription,
                            status: products[0].status,
                            imageUrls: products[0].imageUrls,
                            hasVariants: true,
                            displayOrder: products[0].displayOrder,
                        }
                    })

                    parentId = parent.id
                    console.log(`   ✓ Created parent product: ${parentId}`)
                }

                // Create variants from old products
                for (const product of products) {
                    const sizeMatch = product.name.match(/№(\d+)/)
                    const variantName = sizeMatch ? `№${sizeMatch[1]}` : 'Стандарт'
                    const displayOrder = parseInt(sizeMatch?.[1] || '0')

                    const variant = await db.productVariant.create({
                        data: {
                            productId: parentId,
                            name: variantName,
                            size: null, // Can be filled manually later in admin
                            price: product.price,
                            stock: 0, // Set to 0, admin will update
                            status: product.status,
                            isAvailable: product.status === 'AVAILABLE',
                            displayOrder,
                        }
                    })

                    console.log(`   ✓ Created variant: ${variantName} (${variant.id})`)
                }

                // Mark old products as HIDDEN (don't delete yet)
                await db.product.updateMany({
                    where: { id: { in: products.map(p => p.id) } },
                    data: { status: 'HIDDEN' }
                })

                console.log(`   ✓ Marked ${products.length} old products as HIDDEN\n`)
            } else {
                console.log(`   (Dry run - no changes made)\n`)
            }
        }

        console.log(`\n✅ Migration ${dryRun ? 'preview' : 'complete'}!`)
        console.log(`\nSummary:`)
        console.log(`- Product families: ${groups.size}`)
        console.log(`- Total products to migrate: ${oysters.length}`)

        if (!dryRun) {
            console.log(`\n⚠️  Next steps:`)
            console.log(`1. Check the catalog to verify variants display correctly`)
            console.log(`2. Update variant sizes in admin panel if needed`)
            console.log(`3. Set stock levels for each variant`)
            console.log(`4. After verification, delete old HIDDEN products`)
        } else {
            console.log(`\n💡 Run with dryRun=false to apply changes`)
        }

    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    } finally {
        await db.$disconnect()
    }
}

// Run migration
const dryRun = process.argv.includes('--live') ? false : true
migrateOystersToVariants(dryRun)
