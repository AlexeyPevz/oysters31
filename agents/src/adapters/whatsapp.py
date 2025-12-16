"""WhatsApp adapter - Cloud API webhook handler and sender."""

import hashlib
import hmac
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, Response
import httpx

from src.config import settings
from src.agents.graph import run_agent
from src.agents.state import AgentRunRequest


router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


def verify_whatsapp_signature(signature: str, body: bytes) -> bool:
    """Verify WhatsApp webhook signature."""
    if not settings.whatsapp_webhook_secret:
        return True  # Skip verification if not configured
    
    expected = hmac.new(
        settings.whatsapp_webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.get("/webhook")
async def whatsapp_verify(request: Request) -> Response:
    """
    Webhook verification for WhatsApp Cloud API.
    
    Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def whatsapp_webhook(request: Request) -> Response:
    """
    Handle incoming WhatsApp messages via Cloud API.
    
    Payload structure:
    {
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "79161234567",
                        "text": {"body": "Привет"}
                    }]
                }
            }]
        }]
    }
    """
    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256", "")
    body = await request.body()
    
    if not verify_whatsapp_signature(signature, body):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # Parse payload
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Process only message events
    if data.get("object") != "whatsapp_business_account":
        return Response(status_code=200)
    
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            
            for message in messages:
                await _process_whatsapp_message(message, value)
    
    return Response(status_code=200)


async def _process_whatsapp_message(message: dict, value: dict) -> None:
    """Process a single WhatsApp message."""
    # Only handle text messages for now
    if message.get("type") != "text":
        return
    
    phone = message.get("from", "")
    text = message.get("text", {}).get("body", "")
    message_id = message.get("id", "")
    
    if not phone or not text:
        return
    
    # Get phone number ID for replies
    phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
    
    # Create customer_id from phone
    customer_id = f"wa:{phone}"
    
    try:
        request_data = AgentRunRequest(
            channel="whatsapp",
            customer_id=customer_id,
            external_id=phone,
            message=text,
            metadata={
                "phone": phone,
                "message_id": message_id,
                "phone_number_id": phone_number_id,
            }
        )
        
        response = await run_agent(request_data)
        
        # Send reply
        await send_whatsapp_message(phone_number_id, phone, response.reply)
        
    except Exception as e:
        print(f"WhatsApp webhook error: {e}")
        # Send error message
        await send_whatsapp_message(
            phone_number_id,
            phone,
            "Извините, произошла ошибка. Попробуйте позже или напишите нам в Telegram."
        )


async def send_whatsapp_message(
    phone_number_id: str,
    to: str,
    text: str,
) -> dict:
    """
    Send message via WhatsApp Cloud API.
    
    Requires: WHATSAPP_API_TOKEN (permanent token from Meta Business)
    """
    if not settings.whatsapp_api_token:
        print("WhatsApp API token not configured")
        return {"ok": False, "error": "Token not configured"}
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_api_token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()


async def send_whatsapp_template(
    phone_number_id: str,
    to: str,
    template_name: str,
    language: str = "ru",
    components: Optional[list] = None,
) -> dict:
    """
    Send template message (for messages after 24h window).
    
    Template must be pre-approved in Meta Business Manager.
    """
    if not settings.whatsapp_api_token:
        return {"ok": False, "error": "Token not configured"}
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_api_token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
        },
    }
    
    if components:
        payload["template"]["components"] = components
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        return response.json()
