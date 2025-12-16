"""Unit tests for cart tools."""

import pytest
from decimal import Decimal

from src.tools.cart import (
    add_to_cart,
    remove_from_cart,
    update_cart_quantity,
    get_cart_summary,
    calculate_cart_total,
)


@pytest.fixture
def empty_state():
    """Empty agent state."""
    return {"cart": []}


@pytest.fixture
def state_with_cart():
    """State with items in cart."""
    return {
        "cart": [
            {
                "product_id": "prod_1",
                "name": "Устрицы Fine de Claire",
                "quantity": 6,
                "unit": "шт",
                "unit_price": 450.00,
            }
        ]
    }


class TestAddToCart:
    """Tests for add_to_cart function."""
    
    def test_add_new_item(self, empty_state):
        """Test adding new item to empty cart."""
        result = add_to_cart(
            empty_state,
            product_id="prod_1",
            name="Устрицы Fine de Claire",
            quantity=6,
            unit="шт",
            unit_price=Decimal("450.00"),
        )
        
        assert len(result["cart"]) == 1
        assert result["cart"][0]["product_id"] == "prod_1"
        assert result["cart"][0]["quantity"] == 6
    
    def test_add_increases_quantity(self, state_with_cart):
        """Test adding existing item increases quantity."""
        result = add_to_cart(
            state_with_cart,
            product_id="prod_1",
            name="Устрицы Fine de Claire",
            quantity=3,
            unit="шт",
            unit_price=Decimal("450.00"),
        )
        
        assert len(result["cart"]) == 1
        assert result["cart"][0]["quantity"] == 9  # 6 + 3


class TestRemoveFromCart:
    """Tests for remove_from_cart function."""
    
    def test_remove_item(self, state_with_cart):
        """Test removing item from cart."""
        result = remove_from_cart(state_with_cart, "prod_1")
        
        assert len(result["cart"]) == 0
    
    def test_remove_nonexistent(self, state_with_cart):
        """Test removing non-existent item."""
        result = remove_from_cart(state_with_cart, "prod_999")
        
        assert len(result["cart"]) == 1  # Cart unchanged


class TestUpdateCartQuantity:
    """Tests for update_cart_quantity function."""
    
    def test_update_quantity(self, state_with_cart):
        """Test updating item quantity."""
        result = update_cart_quantity(state_with_cart, "prod_1", 10)
        
        assert result["cart"][0]["quantity"] == 10
    
    def test_zero_removes_item(self, state_with_cart):
        """Test setting quantity to 0 removes item."""
        result = update_cart_quantity(state_with_cart, "prod_1", 0)
        
        assert len(result["cart"]) == 0


class TestGetCartSummary:
    """Tests for get_cart_summary function."""
    
    def test_empty_cart(self, empty_state):
        """Test summary for empty cart."""
        result = get_cart_summary(empty_state)
        
        assert result == "Корзина пуста"
    
    def test_cart_with_items(self, state_with_cart):
        """Test summary for cart with items."""
        result = get_cart_summary(state_with_cart)
        
        assert "Устрицы Fine de Claire" in result
        assert "2700" in result  # 6 * 450


class TestCalculateCartTotal:
    """Tests for calculate_cart_total function."""
    
    def test_empty_cart(self, empty_state):
        """Test total for empty cart."""
        result = calculate_cart_total(empty_state)
        
        assert result == Decimal("0")
    
    def test_cart_with_items(self, state_with_cart):
        """Test total calculation."""
        result = calculate_cart_total(state_with_cart)
        
        assert result == Decimal("2700")  # 6 * 450
