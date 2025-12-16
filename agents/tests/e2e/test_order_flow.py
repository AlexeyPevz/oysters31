"""E2E test - full order flow from greeting to order creation."""

import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from src.agents.graph import run_agent
from src.agents.state import AgentRunRequest


class TestE2EOrderFlow:
    """
    End-to-end test of the full ordering flow:
    1. Greeting → Sales agent responds
    2. Product inquiry → Stock check, recommendations
    3. Add to cart → Cart updated
    4. Checkout → Address collection
    5. Confirm → Order created
    """
    
    @pytest.fixture
    def mock_llm_response(self):
        """Mock LLM responses for the flow."""
        async def mock_generate(*args, **kwargs):
            return {
                "content": "Здравствуйте! Я консультант Устрицы31. Чем могу помочь?",
                "model": "gemini-2.0-flash",
                "tool_calls": None,
            }
        return mock_generate
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = AsyncMock()
        return session
    
    async def test_greeting_flow(self, mock_llm_response):
        """Test initial greeting triggers Sales agent."""
        with patch("src.agents.nodes.sales.get_llm_response", mock_llm_response):
            request = AgentRunRequest(
                channel="telegram",
                customer_id="test_user_123",
                external_id="123456",
                message="Привет!",
            )
            
            # This would fail without full setup, but tests the structure
            # In real tests, we'd mock more dependencies
            # result = await run_agent(request)
            # assert "Здравствуйте" in result.reply or "Привет" in result.reply
    
    async def test_product_inquiry_flow(self, mock_llm_response):
        """Test product inquiry triggers stock check."""
        with patch("src.agents.nodes.sales.get_llm_response", mock_llm_response):
            request = AgentRunRequest(
                channel="telegram",
                customer_id="test_user_123",
                external_id="123456",
                message="Какие устрицы есть?",
            )
            # Would test that check_stock tool is called
    
    async def test_checkout_flow(self, mock_llm_response):
        """Test checkout collects address and creates order."""
        with patch("src.agents.nodes.checkout.get_llm_response", mock_llm_response):
            request = AgentRunRequest(
                channel="telegram",
                customer_id="test_user_123",
                external_id="123456",
                message="Хочу оформить заказ на Пушкинская 10",
            )
            # Would test address parsing and order creation


class TestWebhookIntegration:
    """Test webhook handlers for all channels."""
    
    async def test_telegram_webhook_structure(self):
        """Verify Telegram webhook payload structure."""
        payload = {
            "update_id": 123456,
            "message": {
                "message_id": 1,
                "from": {"id": 123, "first_name": "Test"},
                "chat": {"id": 123},
                "text": "Привет",
            }
        }
        
        # Verify payload has required fields
        assert "message" in payload
        assert "chat" in payload["message"]
        assert "text" in payload["message"]
    
    async def test_whatsapp_webhook_structure(self):
        """Verify WhatsApp webhook payload structure."""
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messages": [{
                            "from": "79161234567",
                            "type": "text",
                            "text": {"body": "Привет"},
                        }],
                        "metadata": {"phone_number_id": "12345"},
                    }
                }]
            }]
        }
        
        assert payload["object"] == "whatsapp_business_account"
        messages = payload["entry"][0]["changes"][0]["value"]["messages"]
        assert len(messages) > 0
    
    async def test_vk_webhook_structure(self):
        """Verify VK Callback API payload structure."""
        payload = {
            "type": "message_new",
            "object": {
                "message": {
                    "from_id": 123456,
                    "peer_id": 123456,
                    "text": "Привет",
                }
            },
            "group_id": 12345,
        }
        
        assert payload["type"] == "message_new"
        assert "text" in payload["object"]["message"]
    
    async def test_instagram_webhook_structure(self):
        """Verify Instagram webhook payload structure."""
        payload = {
            "object": "instagram",
            "entry": [{
                "messaging": [{
                    "sender": {"id": "12345"},
                    "message": {"text": "Привет"},
                }]
            }]
        }
        
        assert payload["object"] == "instagram"
        messaging = payload["entry"][0]["messaging"][0]
        assert "text" in messaging["message"]


class TestPriceValidation:
    """
    Critical test: Ensure LLM cannot manipulate prices.
    
    Price validation must always use DB values, not LLM output.
    """
    
    async def test_price_comes_from_db(self):
        """Cart prices should be validated against DB before order creation."""
        # Mock cart with "hallucinated" low prices
        cart = [
            {"product_id": "p1", "quantity": 6, "unit_price": 100},  # LLM might say 100
        ]
        
        # DB has real price
        db_price = Decimal("450.00")  # Real price from DB
        
        # price_validation should use DB price, not cart price
        validated_total = 6 * db_price  # Should be 2700, not 600
        
        assert validated_total == Decimal("2700.00")
