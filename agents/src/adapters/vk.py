"""VK adapter - Callback API webhook handler and sender."""

import hashlib
import json
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, Response
import httpx

from src.config import settings
from src.agents.graph import run_agent
from src.agents.state import AgentRunRequest


router = APIRouter(prefix="/vk", tags=["vk"])


@router.post("/webhook")
async def vk_webhook(request: Request) -> Response:
    """
    Handle VK Callback API events.
    
    VK sends different event types:
    - confirmation: return confirmation code
    - message_new: new message received
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = data.get("type")
    
    # Confirmation request
    if event_type == "confirmation":
        if data.get("group_id") == settings.vk_group_id:
            return Response(
                content=settings.vk_confirmation_code,
                media_type="text/plain"
            )
        raise HTTPException(status_code=403, detail="Invalid group_id")
    
    # Verify secret key
    if settings.vk_secret_key and data.get("secret") != settings.vk_secret_key:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Process message
    if event_type == "message_new":
        await _process_vk_message(data.get("object", {}))
    
    # VK requires "ok" response
    return Response(content="ok", media_type="text/plain")


async def _process_vk_message(obj: dict) -> None:
    """Process incoming VK message."""
    message = obj.get("message", {})
    
    user_id = message.get("from_id")
    peer_id = message.get("peer_id")
    text = message.get("text", "")
    
    if not user_id or not text:
        return
    
    # Create customer_id from VK user_id
    customer_id = f"vk:{user_id}"
    
    try:
        request_data = AgentRunRequest(
            channel="vk",
            customer_id=customer_id,
            external_id=str(user_id),
            message=text,
            metadata={
                "peer_id": peer_id,
                "user_id": user_id,
            }
        )
        
        response = await run_agent(request_data)
        
        # Send reply
        await send_vk_message(peer_id, response.reply)
        
    except Exception as e:
        print(f"VK webhook error: {e}")
        await send_vk_message(
            peer_id,
            "Извините, произошла ошибка. Попробуйте позже или напишите нам в Telegram."
        )


async def send_vk_message(
    peer_id: int,
    text: str,
    keyboard: Optional[dict] = None,
) -> dict:
    """
    Send message via VK API.
    
    Requires: VK_API_TOKEN (community token with messages permission)
    """
    if not settings.vk_api_token:
        print("VK API token not configured")
        return {"ok": False, "error": "Token not configured"}
    
    import random
    
    url = "https://api.vk.com/method/messages.send"
    
    params = {
        "access_token": settings.vk_api_token,
        "v": "5.131",
        "peer_id": peer_id,
        "message": text,
        "random_id": random.randint(1, 2**31),
    }
    
    if keyboard:
        params["keyboard"] = json.dumps(keyboard)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=params)
        return response.json()


async def get_vk_user_info(user_id: int) -> Optional[dict]:
    """Get VK user info for personalization."""
    if not settings.vk_api_token:
        return None
    
    url = "https://api.vk.com/method/users.get"
    
    params = {
        "access_token": settings.vk_api_token,
        "v": "5.131",
        "user_ids": user_id,
        "fields": "first_name,last_name,phone",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=params)
        data = response.json()
        
        users = data.get("response", [])
        return users[0] if users else None


def create_vk_keyboard(
    buttons: list[list[dict]],
    one_time: bool = False,
    inline: bool = False,
) -> dict:
    """
    Create VK keyboard markup.
    
    Example:
        create_vk_keyboard([
            [{"action": {"type": "text", "label": "Меню"}}],
            [{"action": {"type": "text", "label": "Статус заказа"}}],
        ])
    """
    return {
        "one_time": one_time,
        "inline": inline,
        "buttons": buttons,
    }
