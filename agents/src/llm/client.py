"""LLM client with fallback chain: Gemini → DeepSeek → Qwen."""

import asyncio
from typing import Any, Optional

import httpx

from src.config import settings


class LLMError(Exception):
    """LLM request failed."""
    pass


class LLMClient:
    """
    LLM client with fallback chain.
    
    Primary: Gemini 2.0 Flash (free tier)
    Fallback 1: DeepSeek V3.2 via OpenRouter
    Fallback 2: Qwen via OpenRouter
    """
    
    GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=settings.llm_timeout)
        self.max_retries = 3
        self.backoff_base = 1.0
    
    async def close(self):
        """Close HTTP client."""
        await self.http_client.aclose()
    
    async def _call_gemini(
        self,
        system_prompt: str,
        messages: list[dict],
        tools: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Call Gemini API with function calling support."""
        if not settings.gemini_api_key:
            raise LLMError("Gemini API key not configured")
        
        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            if msg.get("role") == "tool":
                # Tool result message
                contents.append({
                    "role": "function",
                    "parts": [{
                        "functionResponse": {
                            "name": msg.get("name", "unknown"),
                            "response": {"result": msg.get("content", "")}
                        }
                    }]
                })
            elif msg.get("role") == "assistant" and msg.get("tool_calls"):
                # Assistant with function call
                for tc in msg["tool_calls"]:
                    contents.append({
                        "role": "model",
                        "parts": [{
                            "functionCall": {
                                "name": tc.get("name"),
                                "args": tc.get("arguments", {})
                            }
                        }]
                    })
            else:
                role = "user" if msg["role"] == "user" else "model"
                content = msg.get("content", "")
                if content:
                    contents.append({
                        "role": role,
                        "parts": [{"text": content}]
                    })
        
        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "generationConfig": {
                "temperature": settings.llm_temperature,
                "maxOutputTokens": settings.llm_max_tokens,
            }
        }
        
        # Add function declarations if tools provided
        if tools:
            payload["tools"] = [{
                "functionDeclarations": self._get_tool_declarations(tools)
            }]
        
        url = f"{self.GEMINI_URL}?key={settings.gemini_api_key}"
        response = await self.http_client.post(url, json=payload)
        
        if response.status_code == 429:
            raise LLMError("Gemini rate limit exceeded")
        
        response.raise_for_status()
        data = response.json()
        
        # Extract response
        candidates = data.get("candidates", [])
        if not candidates:
            raise LLMError("No response from Gemini")
        
        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        
        text = ""
        tool_calls = []
        
        for part in parts:
            if "text" in part:
                text += part["text"]
            elif "functionCall" in part:
                fc = part["functionCall"]
                tool_calls.append({
                    "id": f"call_{fc['name']}",
                    "name": fc["name"],
                    "arguments": fc.get("args", {})
                })
        
        return {
            "content": text,
            "model": "gemini-2.0-flash",
            "tool_calls": tool_calls if tool_calls else None,
        }
    
    def _get_tool_declarations(self, tools: list[str]) -> list[dict]:
        """Get function declarations for tools."""
        declarations = {
            "check_stock": {
                "name": "check_stock",
                "description": "Check product availability by name. Returns product info and stock.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_name": {"type": "string", "description": "Product name or partial match"},
                        "delivery_date": {"type": "string", "description": "Optional delivery date (YYYY-MM-DD)"}
                    },
                    "required": ["product_name"]
                }
            },
            "get_product_price": {
                "name": "get_product_price",
                "description": "Get exact product price from database by product ID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string", "description": "Product ID"}
                    },
                    "required": ["product_id"]
                }
            },
            "add_to_cart": {
                "name": "add_to_cart",
                "description": "Add product to cart. Requires product_id and quantity.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string", "description": "Product ID to add"},
                        "quantity": {"type": "integer", "description": "Quantity to add", "default": 1}
                    },
                    "required": ["product_id"]
                }
            },
            "create_order": {
                "name": "create_order",
                "description": "Create order from cart. Requires delivery address confirmation.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "confirm": {"type": "boolean", "description": "User confirmed order"}
                    },
                    "required": ["confirm"]
                }
            },
            "get_order_status": {
                "name": "get_order_status",
                "description": "Get order status by order number or phone.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_number": {"type": "string", "description": "Order number"},
                        "phone": {"type": "string", "description": "Customer phone"}
                    },
                    "required": []
                }
            },
            "escalate_to_human": {
                "name": "escalate_to_human",
                "description": "Transfer conversation to human operator.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {"type": "string", "description": "Reason for escalation"}
                    },
                    "required": ["reason"]
                }
            },
            "calculate_delivery_fee": {
                "name": "calculate_delivery_fee",
                "description": "Calculate delivery fee based on address.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "address": {"type": "string", "description": "Delivery address"}
                    },
                    "required": ["address"]
                }
            }
        }
        
        return [declarations[t] for t in tools if t in declarations]
    
    async def _call_openrouter(
        self,
        model: str,
        system_prompt: str,
        messages: list[dict],
        tools: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """Call OpenRouter API."""
        if not settings.openrouter_api_key:
            raise LLMError("OpenRouter API key not configured")
        
        # Build messages with system prompt
        full_messages = [{"role": "system", "content": system_prompt}]
        full_messages.extend(messages)
        
        payload = {
            "model": model,
            "messages": full_messages,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
        }
        
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        
        response = await self.http_client.post(
            self.OPENROUTER_URL, 
            json=payload, 
            headers=headers
        )
        
        if response.status_code == 429:
            raise LLMError(f"OpenRouter rate limit for {model}")
        
        response.raise_for_status()
        data = response.json()
        
        choices = data.get("choices", [])
        if not choices:
            raise LLMError(f"No response from {model}")
        
        message = choices[0].get("message", {})
        
        return {
            "content": message.get("content", ""),
            "model": model,
            "tool_calls": message.get("tool_calls"),
        }
    
    async def generate(
        self,
        system_prompt: str,
        messages: list[dict],
        tools: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Generate response with fallback chain.
        
        Order: Gemini → DeepSeek V3.2 → Qwen
        """
        models = [
            ("gemini", None),
            ("openrouter", "deepseek/deepseek-chat"),
            ("openrouter", "qwen/qwen-2.5-72b-instruct"),
        ]
        
        last_error = None
        
        for provider, model in models:
            for attempt in range(self.max_retries):
                try:
                    if provider == "gemini":
                        return await self._call_gemini(system_prompt, messages, tools)
                    else:
                        return await self._call_openrouter(model, system_prompt, messages, tools)
                        
                except LLMError as e:
                    last_error = e
                    # Backoff before retry
                    await asyncio.sleep(self.backoff_base * (attempt + 1))
                    continue
                except Exception as e:
                    last_error = LLMError(str(e))
                    break
            
            # Move to next model in chain
            continue
        
        # All models failed
        raise last_error or LLMError("All LLM providers failed")


# Global client instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create LLM client."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


async def get_llm_response(
    system_prompt: str,
    messages: list[dict],
    tools: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Convenience function for getting LLM response."""
    client = get_llm_client()
    return await client.generate(system_prompt, messages, tools)
