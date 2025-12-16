"""Instagram adapter - Graph API webhook handler and sender."""

import hashlib
import hmac
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, Response
import httpx

from src.config import settings
from src.agents.graph import run_agent
from src.agents.state import AgentRunRequest


router = APIRouter(prefix="/instagram", tags=["instagram"])


def verify_instagram_signature(signature: str, body: bytes) -> bool:
    """Verify Instagram webhook signature."""
    if not settings.instagram_app_secret:
        return True
    
    expected = hmac.new(
        settings.instagram_app_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.get("/webhook")
async def instagram_verify(request: Request) -> Response:
    """
    Webhook verification for Instagram Graph API.
    
    Meta sends GET with hub.mode, hub.verify_token, hub.challenge.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if mode == "subscribe" and token == settings.instagram_verify_token:
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def instagram_webhook(request: Request) -> Response:
    """
    Handle Instagram Direct Messages via Graph API.
    
    Requires app review with instagram_manage_messages permission.
    
    Payload structure:
    {
        "object": "instagram",
        "entry": [{
            "messaging": [{
                "sender": {"id": "..."},
                "message": {"text": "..."}
            }]
        }]
    }
    """
    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256", "")
    body = await request.body()
    
    if not verify_instagram_signature(signature, body):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    if data.get("object") != "instagram":
        return Response(status_code=200)
    
    for entry in data.get("entry", []):
        for messaging in entry.get("messaging", []):
            await _process_instagram_message(messaging)
    
    return Response(status_code=200)


async def _process_instagram_message(messaging: dict) -> None:
    """Process a single Instagram message."""
    sender = messaging.get("sender", {})
    message = messaging.get("message", {})
    
    sender_id = sender.get("id")
    text = message.get("text", "")
    
    # Skip if no text (could be image, sticker, etc)
    if not sender_id or not text:
        return
    
    customer_id = f"ig:{sender_id}"
    
    try:
        request_data = AgentRunRequest(
            channel="instagram",
            customer_id=customer_id,
            external_id=sender_id,
            message=text,
            metadata={
                "sender_id": sender_id,
            }
        )
        
        response = await run_agent(request_data)
        
        # Send reply
        await send_instagram_message(sender_id, response.reply)
        
    except Exception as e:
        print(f"Instagram webhook error: {e}")
        # Send fallback message
        await send_instagram_message(
            sender_id,
            "Извините, произошла ошибка. Напишите нам в Telegram @oysters31 или WhatsApp."
        )


async def send_instagram_message(
    recipient_id: str,
    text: str,
) -> dict:
    """
    Send message via Instagram Graph API.
    
    Requires: INSTAGRAM_PAGE_TOKEN (Page Access Token with instagram_manage_messages)
    """
    if not settings.instagram_page_token:
        print("Instagram page token not configured")
        return {"ok": False, "error": "Token not configured"}
    
    url = f"https://graph.facebook.com/v18.0/me/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.instagram_page_token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": text},
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()


async def send_instagram_generic_template(
    recipient_id: str,
    elements: list[dict],
) -> dict:
    """
    Send generic template (cards) via Instagram.
    
    Example element:
    {
        "title": "Устрицы Fine de Claire",
        "subtitle": "6 шт — 2700₽",
        "image_url": "https://...",
        "buttons": [{"type": "postback", "title": "Добавить", "payload": "add_prod_1"}]
    }
    """
    if not settings.instagram_page_token:
        return {"ok": False, "error": "Token not configured"}
    
    url = f"https://graph.facebook.com/v18.0/me/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.instagram_page_token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "recipient": {"id": recipient_id},
        "message": {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": elements,
                }
            }
        },
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()


# Note: Until app review is complete, you can use this auto-reply
AUTO_REPLY_BEFORE_REVIEW = """
Привет! 👋

Наш бот в Instagram пока в разработке. 
Для быстрого заказа напишите нам:

📱 Telegram: @oysters31
💬 WhatsApp: +7 (XXX) XXX-XX-XX

Спасибо за понимание! 🦪
"""
