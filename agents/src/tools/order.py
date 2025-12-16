"""Order tools - create orders and check status."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import (
    Order, OrderItem, OrderHistory, OrderStatus, 
    DeliverySlot, PaymentMethod, Product, Client
)
from src.agents.state import CartItem, DeliveryAddress


def generate_order_number() -> str:
    """Generate unique order number."""
    now = datetime.utcnow()
    random_part = uuid.uuid4().hex[:4].upper()
    return f"O{now.strftime('%y%m%d')}-{random_part}"


async def price_validation(
    session: AsyncSession,
    cart: list,  # Can be list[CartItem] or list[dict]
) -> tuple[Decimal, list[dict]]:
    """
    Validate and recalculate prices from database.
    
    CRITICAL: This ensures LLM cannot manipulate prices.
    Always call this before creating an order.
    
    Returns:
        Tuple of (total_amount, validated_items)
    """
    validated_items = []
    total = Decimal("0")
    
    for item in cart:
        # Handle both Pydantic models and dicts
        if isinstance(item, dict):
            product_id = item.get("product_id")
            quantity = item.get("quantity")
        else:
            # CartItem Pydantic model
            product_id = item.product_id
            quantity = item.quantity
        
        # Get current price from DB
        query = select(Product).where(Product.id == product_id)
        result = await session.execute(query)
        product = result.scalar_one_or_none()
        
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        # Use DB price, not cart price
        db_price = product.price
        item_total = db_price * quantity
        total += item_total
        
        validated_items.append({
            "product_id": product.id,
            "name": product.name,
            "quantity": quantity,
            "unit_price": float(db_price),
            "total": float(item_total),
        })
    
    return total, validated_items


async def create_order(
    session: AsyncSession,
    customer_id: str,
    cart: list,  # Can be list[CartItem] or list[dict]
    address: DeliveryAddress,
    delivery_date: datetime,
    slot: str,
    payment_method: str = "CASH",
    channel: str = "TELEGRAM",
    phone: Optional[str] = None,
) -> dict:
    """
    Create order with full price validation.
    
    This is the only way to create orders from agents.
    All prices are validated against the database.
    """
    # Validate prices
    total_amount, validated_items = await price_validation(session, cart)
    
    # Generate order number
    order_number = generate_order_number()
    order_id = str(uuid.uuid4())[:25]  # cuid-like
    
    # Map slot string to enum
    slot_enum = DeliverySlot[slot.upper()] if slot.upper() in DeliverySlot.__members__ else DeliverySlot.DAY
    payment_enum = PaymentMethod[payment_method.upper()] if payment_method.upper() in PaymentMethod.__members__ else PaymentMethod.CASH
    
    # Create order
    order = Order(
        id=order_id,
        order_number=order_number,
        items=validated_items,
        total_amount=total_amount,
        delivery_street=address.street,
        delivery_house=address.house,
        delivery_flat=address.flat,
        delivery_porch=address.porch,
        delivery_floor=address.floor,
        delivery_comment=address.comment,
        delivery_date=delivery_date,
        slot=slot_enum,
        payment_method=payment_enum,
        status=OrderStatus.NEW,
        history=[{
            "status": "NEW",
            "timestamp": datetime.utcnow().isoformat(),
            "channel": channel,
            "customer_id": customer_id,
        }],
    )
    
    session.add(order)
    
    # Create order items
    for item in validated_items:
        order_item = OrderItem(
            id=str(uuid.uuid4())[:25],
            order_id=order_id,
            product_id=item["product_id"],
            quantity=item["quantity"],
            unit_price=Decimal(str(item["unit_price"])),
        )
        session.add(order_item)
    
    # Create initial history entry
    history = OrderHistory(
        id=str(uuid.uuid4())[:25],
        order_id=order_id,
        changed_by=f"agent:{channel}",
        old_status=OrderStatus.NEW,
        new_status=OrderStatus.NEW,
        comment=f"Order created via {channel}",
    )
    session.add(history)
    
    await session.commit()
    
    return {
        "success": True,
        "order_id": order_id,
        "order_number": order_number,
        "total_amount": float(total_amount),
        "items_count": len(validated_items),
        "delivery_date": delivery_date.isoformat(),
        "slot": slot,
    }


async def get_order_status(
    session: AsyncSession,
    phone: Optional[str] = None,
    order_number: Optional[str] = None,
    limit: int = 5,
) -> list[dict]:
    """
    Get order status by phone or order number.
    
    Returns last N orders for the customer.
    """
    if not phone and not order_number:
        return []
    
    query = select(Order).order_by(Order.created_at.desc()).limit(limit)
    
    if order_number:
        query = query.where(Order.order_number == order_number)
    elif phone:
        # Find client by phone
        client_query = select(Client).where(Client.phone == phone)
        client_result = await session.execute(client_query)
        client = client_result.scalar_one_or_none()
        
        if not client:
            return []
        
        if client.user_id:
            query = query.where(Order.user_id == client.user_id)
        else:
            return []  # No orders linked
    
    result = await session.execute(query)
    orders = result.scalars().all()
    
    status_labels = {
        OrderStatus.NEW: "Новый",
        OrderStatus.CONFIRMED: "Подтверждён",
        OrderStatus.PREP: "Готовится",
        OrderStatus.IN_TRANSIT: "В доставке",
        OrderStatus.DELIVERED: "Доставлен",
        OrderStatus.CANCELLED: "Отменён",
    }
    
    return [
        {
            "order_number": o.order_number,
            "status": o.status.value,
            "status_label": status_labels.get(o.status, o.status.value),
            "total": float(o.total_amount),
            "delivery_date": o.delivery_date.isoformat(),
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ]
