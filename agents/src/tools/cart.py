"""Cart tools - manage shopping cart in state."""

from decimal import Decimal
from typing import Any

from src.agents.state import CartItem


def add_to_cart(
    state: dict[str, Any],
    product_id: str,
    name: str,
    quantity: int,
    unit: str,
    unit_price: Decimal,
) -> dict[str, Any]:
    """
    Add item to cart or update quantity if exists.
    
    Cart is stored in agent state, not database.
    """
    cart = list(state.get("cart", []))
    
    # Check if product already in cart
    for i, item in enumerate(cart):
        if item.get("product_id") == product_id:
            # Update quantity
            cart[i] = {
                **item,
                "quantity": item["quantity"] + quantity,
            }
            return {
                **state,
                "cart": cart,
            }
    
    # Add new item
    cart.append({
        "product_id": product_id,
        "name": name,
        "quantity": quantity,
        "unit": unit,
        "unit_price": float(unit_price),
    })
    
    return {
        **state,
        "cart": cart,
    }


def remove_from_cart(
    state: dict[str, Any],
    product_id: str,
) -> dict[str, Any]:
    """Remove item from cart."""
    cart = state.get("cart", [])
    new_cart = [item for item in cart if item.get("product_id") != product_id]
    
    return {
        **state,
        "cart": new_cart,
    }


def update_cart_quantity(
    state: dict[str, Any],
    product_id: str,
    quantity: int,
) -> dict[str, Any]:
    """Update quantity of item in cart."""
    cart = list(state.get("cart", []))
    
    for i, item in enumerate(cart):
        if item.get("product_id") == product_id:
            if quantity <= 0:
                cart.pop(i)
            else:
                cart[i] = {**item, "quantity": quantity}
            break
    
    return {
        **state,
        "cart": cart,
    }


def get_cart_summary(state: dict[str, Any]) -> str:
    """Get human-readable cart summary."""
    cart = state.get("cart", [])
    
    if not cart:
        return "Корзина пуста"
    
    lines = []
    total = Decimal("0")
    
    for item in cart:
        qty = item.get("quantity", 0)
        price = Decimal(str(item.get("unit_price", 0)))
        item_total = qty * price
        total += item_total
        
        lines.append(f"• {item.get('name')}: {qty} × {price}₽ = {item_total}₽")
    
    lines.append(f"\n**Итого: {total}₽**")
    
    return "\n".join(lines)


def calculate_cart_total(state: dict[str, Any]) -> Decimal:
    """Calculate total cart value."""
    cart = state.get("cart", [])
    total = Decimal("0")
    
    for item in cart:
        qty = item.get("quantity", 0)
        price = Decimal(str(item.get("unit_price", 0)))
        total += qty * price
    
    return total
