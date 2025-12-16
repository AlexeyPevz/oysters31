"""Unit tests for stock tools."""

import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from src.tools.stock import (
    check_stock,
    get_product_price,
    get_available_products,
    get_next_supply_dates,
)
from src.db.models import Product, ProductStatus, Supply, SupplyItem


@pytest.fixture
def mock_session():
    """Create mock database session."""
    session = AsyncMock()
    return session


@pytest.fixture
def sample_product():
    """Sample product for testing."""
    product = MagicMock()
    product.id = "prod_123"
    product.name = "Устрицы Fine de Claire"
    product.slug = "fine-de-claire"
    product.price = Decimal("450.00")
    product.unit = "шт"
    product.status = ProductStatus.AVAILABLE
    product.short_description = "Французские устрицы высшего качества"
    product.display_order = 1
    return product


class TestCheckStock:
    """Tests for check_stock function."""
    
    async def test_product_found(self, mock_session, sample_product):
        """Test finding a product by name."""
        # Setup mock
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = [sample_product]
        mock_session.execute.return_value = mock_result
        
        # Call function
        result = await check_stock(mock_session, "устриц")
        
        # Assertions
        assert result["found"] is True
        assert result["product"]["name"] == "Устрицы Fine de Claire"
        assert result["product"]["price"] == 450.00
    
    async def test_product_not_found(self, mock_session):
        """Test when product is not found."""
        # Setup mock
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = mock_result
        
        # Call function
        result = await check_stock(mock_session, "несуществующий")
        
        # Assertions
        assert result["found"] is False
        assert "не найден" in result["message"]


class TestGetProductPrice:
    """Tests for get_product_price function."""
    
    async def test_price_found(self, mock_session, sample_product):
        """Test getting product price."""
        # Setup mock
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = sample_product
        mock_session.execute.return_value = mock_result
        
        # Call function
        result = await get_product_price(mock_session, "prod_123")
        
        # Assertions
        assert result["found"] is True
        assert result["price"] == 450.00
        assert result["name"] == "Устрицы Fine de Claire"
    
    async def test_price_not_found(self, mock_session):
        """Test when product is not found."""
        # Setup mock
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        
        # Call function
        result = await get_product_price(mock_session, "nonexistent")
        
        # Assertions
        assert result["found"] is False
        assert "error" in result


class TestGetAvailableProducts:
    """Tests for get_available_products function."""
    
    async def test_list_products(self, mock_session, sample_product):
        """Test listing available products."""
        # Setup mock
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = [sample_product]
        mock_session.execute.return_value = mock_result
        
        # Call function
        result = await get_available_products(mock_session)
        
        # Assertions
        assert len(result) == 1
        assert result[0]["name"] == "Устрицы Fine de Claire"
        assert result[0]["status"] == "AVAILABLE"
