"""Unit tests for order tools."""

import pytest
from decimal import Decimal
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.tools.order import (
    price_validation,
    create_order,
    get_order_status,
    generate_order_number,
)
from src.agents.state import CartItem, DeliveryAddress
from src.db.models import Product, Order, OrderStatus


@pytest.fixture
def mock_session():
    """Create mock database session."""
    session = AsyncMock()
    return session


@pytest.fixture
def sample_cart():
    """Sample cart for testing."""
    return [
        CartItem(
            product_id="prod_1",
            name="Устрицы Fine de Claire",
            quantity=6,
            unit="шт",
            unit_price=Decimal("450.00"),
        ),
        CartItem(
            product_id="prod_2", 
            name="Икра черная",
            quantity=1,
            unit="шт",
            unit_price=Decimal("3500.00"),
        ),
    ]


@pytest.fixture
def sample_address():
    """Sample delivery address."""
    return DeliveryAddress(
        street="Пушкинская",
        house="10",
        flat="25",
        porch="2",
        floor="5",
    )


class TestGenerateOrderNumber:
    """Tests for order number generation."""
    
    def test_format(self):
        """Test order number format."""
        order_num = generate_order_number()
        
        # Should start with O and date
        assert order_num.startswith("O")
        # Should have dash separator
        assert "-" in order_num
        # Should be reasonable length
        assert len(order_num) >= 10


class TestPriceValidation:
    """Tests for price validation (anti-hallucination)."""
    
    async def test_validates_prices_from_db(self, mock_session, sample_cart):
        """Test that prices are fetched from DB, not cart."""
        # Setup mock - DB has different price than cart!
        product1 = MagicMock()
        product1.id = "prod_1"
        product1.name = "Устрицы Fine de Claire"
        product1.price = Decimal("500.00")  # DB price differs from cart
        
        product2 = MagicMock()
        product2.id = "prod_2"
        product2.name = "Икра черная"
        product2.price = Decimal("4000.00")  # DB price differs from cart
        
        mock_result1 = AsyncMock()
        mock_result1.scalar_one_or_none.return_value = product1
        
        mock_result2 = AsyncMock()
        mock_result2.scalar_one_or_none.return_value = product2
        
        mock_session.execute.side_effect = [mock_result1, mock_result2]
        
        # Call function
        total, items = await price_validation(mock_session, sample_cart)
        
        # Should use DB prices, not cart prices
        assert total == Decimal("7000.00")  # 6*500 + 1*4000 = 7000
        assert items[0]["unit_price"] == 500.00
        assert items[1]["unit_price"] == 4000.00
    
    async def test_product_not_found_raises(self, mock_session, sample_cart):
        """Test that missing product raises error."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        
        with pytest.raises(ValueError, match="not found"):
            await price_validation(mock_session, sample_cart)


class TestGetOrderStatus:
    """Tests for get_order_status function."""
    
    async def test_returns_order_info(self, mock_session):
        """Test getting order status by order number."""
        # Setup mock order
        order = MagicMock()
        order.order_number = "O241215-ABCD"
        order.status = OrderStatus.CONFIRMED
        order.total_amount = Decimal("2700.00")
        order.delivery_date = datetime(2024, 12, 17, 10, 0)
        order.created_at = datetime(2024, 12, 15, 12, 0)
        
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = [order]
        mock_session.execute.return_value = mock_result
        
        # Call function
        result = await get_order_status(mock_session, order_number="O241215-ABCD")
        
        # Assertions
        assert len(result) == 1
        assert result[0]["order_number"] == "O241215-ABCD"
        assert result[0]["status"] == "CONFIRMED"
        assert result[0]["status_label"] == "Подтверждён"
