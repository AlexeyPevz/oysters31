import { NextRequest, NextResponse } from "next/server"
import { getProductBySlug } from "@/lib/services/product"

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)
  if (!product) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 })
  }

  return NextResponse.json(product)
}
