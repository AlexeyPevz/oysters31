"""State definitions for the agent graph."""

from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


class CartItem(BaseModel):
    """Item in the shopping cart."""
    product_id: str
    name: str
    quantity: int
    unit: str
    unit_price: Decimal


class DeliveryAddress(BaseModel):
    """Delivery address structure."""
    street: str
    house: str
    flat: Optional[str] = None
    porch: Optional[str] = None
    floor: Optional[str] = None
    comment: Optional[str] = None


class SeafoodBusinessState(BaseModel):
    """
    Main state for the seafood ordering agent.
    
    This state is passed through the LangGraph and updated by each node.
    """
    # Conversation
    messages: list[dict[str, Any]] = Field(default_factory=list)
    
    # Customer
    customer_id: str  # unified_customer_id
    channel: str  # telegram/whatsapp/vk/instagram/site
    phone: Optional[str] = None
    
    # Shopping cart
    cart: list[CartItem] = Field(default_factory=list)
    order_total: Optional[Decimal] = None
    
    # Delivery
    delivery_address: Optional[DeliveryAddress] = None
    delivery_date: Optional[str] = None
    delivery_slot: Optional[str] = None  # MORNING/DAY/EVENING or hourly
    
    # Context
    available_products: list[dict[str, Any]] = Field(default_factory=list)
    next_supply_dates: list[str] = Field(default_factory=list)
    customer_history: list[dict[str, Any]] = Field(default_factory=list)
    
    # Flow control
    current_stage: str = "greeting"  # greeting/sales/checkout/support
    escalate_to_human: bool = False
    is_paused_for_human: bool = False
    
    # Agent notes (internal)
    agent_notes: Optional[str] = None


class AgentRunRequest(BaseModel):
    """Request to run the agent graph."""
    channel: str  # telegram/whatsapp/vk/instagram/site
    customer_id: str  # unified_customer_id or external_id
    external_id: str  # ID in the channel (telegram user id, etc)
    message: str  # User's message
    state_id: Optional[str] = None  # Resume from existing state
    metadata: Optional[dict[str, Any]] = None  # Extra channel-specific data


class AgentRunResponse(BaseModel):
    """Response from the agent graph."""
    reply: str  # Text response to send
    state_id: str  # State ID for continuation
    current_stage: str  # Current conversation stage
    escalate_to_human: bool  # If true, need human intervention
    cart_summary: Optional[str] = None  # Cart description if applicable
    order_id: Optional[str] = None  # Created order ID if applicable
