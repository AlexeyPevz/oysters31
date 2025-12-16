"""Stock tools - check product availability and prices."""

from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Product, ProductStatus, Supply, SupplyItem


async def check_stock(
    session: AsyncSession,
    product_name: str,
    delivery_date: Optional[str] = None,
) -> dict:
    """
    Check product availability and stock.
    
    Args:
        session: Database session
        product_name: Product name or partial match
        delivery_date: Optional delivery date to check supply availability
    
    Returns:
        dict with product info and availability
    """
    # Search for product by name (partial match)
    query = select(Product).where(
        Product.name.ilike(f"%{product_name}%"),
        Product.status.in_([ProductStatus.AVAILABLE, ProductStatus.PREORDER])
    )
    
    result = await session.execute(query)
    products = result.scalars().all()
    
    if not products:
        return {
            "found": False,
            "message": f"Товар '{product_name}' не найден",
            "alternatives": [],
        }
    
    # Get the best match
    product = products[0]
    
    # Check supply availability if date provided
    supply_info = None
    if delivery_date:
        supply_query = select(SupplyItem).join(Supply).where(
            SupplyItem.product_id == product.id,
            Supply.is_active == True,
        )
        supply_result = await session.execute(supply_query)
        supply_item = supply_result.scalar_one_or_none()
        
        if supply_item:
            available = supply_item.quantity - supply_item.reserved_qty
            supply_info = {
                "available_quantity": available,
                "reserved": supply_item.reserved_qty,
                "total": supply_item.quantity,
            }
    
    return {
        "found": True,
        "product": {
            "id": product.id,
            "name": product.name,
            "price": float(product.price),
            "unit": product.unit,
            "status": product.status.value,
            "description": product.short_description,
        },
        "supply": supply_info,
        "alternatives": [
            {"id": p.id, "name": p.name, "price": float(p.price)}
            for p in products[1:4]  # Up to 3 alternatives
        ],
    }


async def get_product_price(
    session: AsyncSession,
    product_id: str,
) -> dict:
    """
    Get current product price from database.
    
    This is the ONLY source of truth for prices.
    LLM must never generate prices without calling this.
    """
    query = select(Product).where(Product.id == product_id)
    result = await session.execute(query)
    product = result.scalar_one_or_none()
    
    if not product:
        return {
            "found": False,
            "error": "Product not found",
        }
    
    return {
        "found": True,
        "product_id": product.id,
        "name": product.name,
        "price": float(product.price),
        "unit": product.unit,
    }


async def get_available_products(
    session: AsyncSession,
    category: Optional[str] = None,
    limit: int = 20,
) -> list[dict]:
    """Get list of available products."""
    query = select(Product).where(
        Product.status.in_([ProductStatus.AVAILABLE, ProductStatus.PREORDER])
    ).order_by(Product.display_order).limit(limit)
    
    if category:
        query = query.where(Product.category == category)
    
    result = await session.execute(query)
    products = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": float(p.price),
            "unit": p.unit,
            "status": p.status.value,
            "description": p.short_description,
        }
        for p in products
    ]


async def get_next_supply_dates(
    session: AsyncSession,
    limit: int = 3,
) -> list[dict]:
    """Get upcoming supply dates."""
    from datetime import datetime
    
    query = select(Supply).where(
        Supply.is_active == True,
        Supply.supply_date >= datetime.utcnow(),
    ).order_by(Supply.supply_date).limit(limit)
    
    result = await session.execute(query)
    supplies = result.scalars().all()
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "date": s.supply_date.isoformat(),
        }
        for s in supplies
    ]
