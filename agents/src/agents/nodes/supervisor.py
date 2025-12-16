"""Supervisor node - routes messages to appropriate agents."""

from typing import Any
from src.agents.state import SeafoodBusinessState


async def supervisor_node(state: SeafoodBusinessState) -> dict[str, Any]:
    """
    Supervisor node that analyzes the message and routes to appropriate agent.
    """
    # Access Pydantic fields directly
    messages = state.messages
    current_stage = state.current_stage
    cart = state.cart
    
    last_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_message = msg.get("content", "")
            break
    
    if not last_message:
        return {"current_stage": "sales"}
    
    last_lower = last_message.lower()
    
    # Support keywords
    support_keywords = [
        "статус", "заказ", "где", "когда", "доставка", "жалоба", 
        "проблема", "помощь", "оператор", "человек"
    ]
    
    # Checkout keywords
    checkout_keywords = [
        "адрес", "оформ", "заказать", "подтверд", "оплат", 
        "доставить", "куда", "слот", "время"
    ]
    
    # Check for support intent
    if any(kw in last_lower for kw in support_keywords):
        if "статус" in last_lower or "где" in last_lower or "заказ" in last_lower:
            return {"current_stage": "support"}
    
    # Check for checkout intent (only if cart has items)
    if cart and any(kw in last_lower for kw in checkout_keywords):
        # Only switch to checkout if we are not already there? 
        # Or always route to checkout agent if intent matches?
        return {"current_stage": "checkout"}
    
    # Check if we should escalate
    escalate_keywords = ["человек", "оператор", "менеджер", "позвоните"]
    if any(kw in last_lower for kw in escalate_keywords):
        return {
            "current_stage": "support",
            "escalate_to_human": True,
        }
    
    # Default to sales
    return {"current_stage": "sales"}
