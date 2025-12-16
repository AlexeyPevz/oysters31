"""Telegram adapter - webhook handler and message sender."""

import hashlib
import hmac
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, Response
import httpx

from src.config import settings
from src.agents.graph import run_agent
from src.agents.state import AgentRunRequest


router = APIRouter(prefix="/telegram", tags=["telegram"])


def verify_telegram_signature(token: str, body: bytes) -> bool:
    """Verify Telegram webhook signature (secret_token header)."""
    # Telegram uses X-Telegram-Bot-Api-Secret-Token header
    # We just compare with our configured secret
    return token == settings.telegram_webhook_secret


@router.post("/webhook")
async def telegram_webhook(request: Request) -> Response:
    """
    Handle incoming Telegram updates.
    
    This endpoint receives messages from Telegram and processes them
    through the agent graph.
    """
    # Verify secret token
    secret_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if settings.telegram_webhook_secret and not verify_telegram_signature(secret_token, b""):
        raise HTTPException(status_code=403, detail="Invalid secret token")
    
    # Parse update
    try:
        update = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Handle message
    message = update.get("message")
    if not message:
        # Might be callback_query, edited_message, etc.
        # For now, just acknowledge
        return Response(status_code=200)
    
    # Extract data
    chat_id = message.get("chat", {}).get("id")
    user_id = message.get("from", {}).get("id")
    text = message.get("text", "")
    
    if not chat_id or not text:
        return Response(status_code=200)
    
    # Create customer_id from telegram user_id
    customer_id = f"tg:{user_id}"
    
    # Run agent
    try:
        request_data = AgentRunRequest(
            channel="telegram",
            customer_id=customer_id,
            external_id=str(user_id),
            message=text,
            metadata={
                "chat_id": chat_id,
                "username": message.get("from", {}).get("username"),
                "first_name": message.get("from", {}).get("first_name"),
            }
        )
        
        response = await run_agent(request_data)
        
        # Send reply
        await send_telegram_message(chat_id, response.reply)
        
    except Exception as e:
        # Send error message
        await send_telegram_message(
            chat_id, 
            "Извините, произошла ошибка. Попробуйте ещё раз или напишите нам напрямую."
        )
        print(f"Telegram webhook error: {e}")
    
    return Response(status_code=200)


async def send_telegram_message(
    chat_id: int,
    text: str,
    parse_mode: str = "Markdown",
    reply_markup: Optional[dict] = None,
) -> dict:
    """Send message to Telegram chat."""
    if not settings.telegram_bot_token:
        print("Telegram bot token not configured")
        return {"ok": False, "error": "Bot token not configured"}
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    
    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
    }
    
    if parse_mode:
        payload["parse_mode"] = parse_mode
    
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        return response.json()


async def send_telegram_typing(chat_id: int) -> None:
    """Send typing indicator."""
    if not settings.telegram_bot_token:
        return
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendChatAction"
    
    async with httpx.AsyncClient() as client:
        await client.post(url, json={
            "chat_id": chat_id,
            "action": "typing",
        })


async def setup_telegram_webhook(webhook_url: str) -> dict:
    """
    Set up Telegram webhook.
    
    Call this once during deployment to register the webhook URL.
    """
    if not settings.telegram_bot_token:
        return {"ok": False, "error": "Bot token not configured"}
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook"
    
    payload = {
        "url": webhook_url,
        "allowed_updates": ["message", "callback_query"],
    }
    
    if settings.telegram_webhook_secret:
        payload["secret_token"] = settings.telegram_webhook_secret
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        return response.json()


async def delete_telegram_webhook() -> dict:
    """Delete Telegram webhook."""
    if not settings.telegram_bot_token:
        return {"ok": False, "error": "Bot token not configured"}
    
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/deleteWebhook"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url)
        return response.json()
