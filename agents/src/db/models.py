"""SQLAlchemy models matching Prisma schema (read-only for products/orders, read-write for agent tables)."""

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.session import Base


# === Enums ===

class ProductCategory(str, PyEnum):
    OYSTERS = "OYSTERS"
    SEA_URCHINS = "SEA_URCHINS"
    SCALLOPS = "SCALLOPS"
    CAVIAR = "CAVIAR"
    SHRIMP = "SHRIMP"
    STURGEON = "STURGEON"
    OTHER = "OTHER"


class ProductStatus(str, PyEnum):
    AVAILABLE = "AVAILABLE"
    PREORDER = "PREORDER"
    SOON = "SOON"
    HIDDEN = "HIDDEN"


class OrderStatus(str, PyEnum):
    NEW = "NEW"
    CONFIRMED = "CONFIRMED"
    PREP = "PREP"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class DeliverySlot(str, PyEnum):
    MORNING = "MORNING"
    DAY = "DAY"
    EVENING = "EVENING"


class PaymentMethod(str, PyEnum):
    CASH = "CASH"
    ONLINE = "ONLINE"


class MessageChannel(str, PyEnum):
    TELEGRAM = "TELEGRAM"
    WHATSAPP = "WHATSAPP"
    VK = "VK"
    INSTAGRAM = "INSTAGRAM"
    SITE = "SITE"


class MessageDirection(str, PyEnum):
    IN = "IN"
    OUT = "OUT"


# === Models (matching Prisma schema) ===

class Product(Base):
    """Product model - READ ONLY from agents."""
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True)
    category: Mapped[ProductCategory] = mapped_column(Enum(ProductCategory))
    image_urls: Mapped[dict] = mapped_column("image_urls", JSON)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    unit: Mapped[str] = mapped_column(String(50))
    short_description: Mapped[Optional[str]] = mapped_column("short_description", Text, nullable=True)
    full_description: Mapped[Optional[str]] = mapped_column("full_description", Text, nullable=True)
    status: Mapped[ProductStatus] = mapped_column(Enum(ProductStatus), default=ProductStatus.AVAILABLE)
    display_order: Mapped[int] = mapped_column("display_order", Integer, default=0)
    is_promoted: Mapped[bool] = mapped_column("is_promoted", default=False)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, default=datetime.utcnow)


class Order(Base):
    """Order model - WRITE for creating orders from agents."""
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    order_number: Mapped[str] = mapped_column("order_number", String(50), unique=True)
    user_id: Mapped[Optional[str]] = mapped_column("user_id", String(30), nullable=True)
    courier_id: Mapped[Optional[str]] = mapped_column("courier_id", String(30), nullable=True)
    promo_code_id: Mapped[Optional[str]] = mapped_column("promo_code_id", String(30), nullable=True)
    drop_id: Mapped[Optional[str]] = mapped_column("drop_id", String(30), nullable=True)
    items: Mapped[dict] = mapped_column(JSON)
    total_amount: Mapped[Decimal] = mapped_column("total_amount", Numeric(12, 2))
    delivery_street: Mapped[str] = mapped_column("delivery_street", String(255))
    delivery_house: Mapped[str] = mapped_column("delivery_house", String(50))
    delivery_flat: Mapped[Optional[str]] = mapped_column("delivery_flat", String(50), nullable=True)
    delivery_porch: Mapped[Optional[str]] = mapped_column("delivery_porch", String(50), nullable=True)
    delivery_floor: Mapped[Optional[str]] = mapped_column("delivery_floor", String(50), nullable=True)
    delivery_comment: Mapped[Optional[str]] = mapped_column("delivery_comment", Text, nullable=True)
    delivery_date: Mapped[datetime] = mapped_column("delivery_date", DateTime)
    slot: Mapped[DeliverySlot] = mapped_column("delivery_slot", Enum(DeliverySlot))
    hourly_slot: Mapped[Optional[str]] = mapped_column("hourly_slot", String(20), nullable=True)
    payment_method: Mapped[PaymentMethod] = mapped_column("payment_method", Enum(PaymentMethod))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.NEW)
    history: Mapped[dict] = mapped_column(JSON)
    feedback_score: Mapped[Optional[int]] = mapped_column("feedback_score", Integer, nullable=True)
    feedback_text: Mapped[Optional[str]] = mapped_column("feedback_text", Text, nullable=True)
    notify_before_hours: Mapped[Optional[int]] = mapped_column("notify_before_hours", Integer, default=1)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, default=datetime.utcnow)


class OrderItem(Base):
    """Order item model."""
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    order_id: Mapped[str] = mapped_column("order_id", String(30), ForeignKey("orders.id"))
    product_id: Mapped[str] = mapped_column("product_id", String(30), ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column("unit_price", Numeric(12, 2))


class OrderHistory(Base):
    """Order history for status changes."""
    __tablename__ = "order_history"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    order_id: Mapped[str] = mapped_column("order_id", String(30), ForeignKey("orders.id"))
    changed_by: Mapped[str] = mapped_column("changed_by", String(100))
    old_status: Mapped[OrderStatus] = mapped_column("old_status", Enum(OrderStatus))
    new_status: Mapped[OrderStatus] = mapped_column("new_status", Enum(OrderStatus))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Client(Base):
    """Client model - for customer lookup."""
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column("user_id", String(30), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    orders_count: Mapped[int] = mapped_column("orders_count", Integer, default=0)
    tags: Mapped[dict] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)


class Supply(Base):
    """Supply (поставка) model."""
    __tablename__ = "supplies"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    supply_date: Mapped[datetime] = mapped_column("supply_date", DateTime)
    is_active: Mapped[bool] = mapped_column("is_active", default=True)
    banner_image: Mapped[Optional[str]] = mapped_column("banner_image", String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime, default=datetime.utcnow)


class SupplyItem(Base):
    """Supply item with quantity."""
    __tablename__ = "supply_items"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    supply_id: Mapped[str] = mapped_column("supply_id", String(30), ForeignKey("supplies.id"))
    product_id: Mapped[str] = mapped_column("product_id", String(30), ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    reserved_qty: Mapped[int] = mapped_column("reserved_qty", Integer, default=0)


# === MAS Tables ===

class CustomerIdentity(Base):
    """Customer identity for omni-channel linking."""
    __tablename__ = "customer_identities"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    unified_customer_id: Mapped[str] = mapped_column("unified_customer_id", String(64))
    channel: Mapped[MessageChannel] = mapped_column(Enum(MessageChannel))
    external_id: Mapped[str] = mapped_column("external_id", String(128))
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_customer_identities_phone", "phone"),
        Index("ix_customer_identities_email", "email"),
        Index("ix_customer_identities_unified", "unified_customer_id"),
    )


class AgentMessage(Base):
    """Agent message log for audit and analytics."""
    __tablename__ = "agent_messages"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    channel: Mapped[MessageChannel] = mapped_column(Enum(MessageChannel))
    customer_id: Mapped[str] = mapped_column("customer_id", String(64))
    direction: Mapped[MessageDirection] = mapped_column(Enum(MessageDirection))
    text: Mapped[str] = mapped_column(Text)
    tool_calls: Mapped[Optional[dict]] = mapped_column("tool_calls", JSON, nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column("llm_model", String(50), nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column("latency_ms", Integer, nullable=True)
    tokens_used: Mapped[Optional[int]] = mapped_column("tokens_used", Integer, nullable=True)
    feedback: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    state_version: Mapped[Optional[str]] = mapped_column("state_version", String(50), nullable=True)
    message_id: Mapped[Optional[str]] = mapped_column("message_id", String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_agent_messages_customer_time", "customer_id", "created_at"),
        Index("ix_agent_messages_feedback", "feedback", "created_at"),
    )
