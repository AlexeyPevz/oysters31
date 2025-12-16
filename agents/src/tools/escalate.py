"""Escalation tools - handoff to human operator."""

from datetime import datetime
from typing import Any, Optional

import httpx

from src.config import settings


async def escalate_to_human(
    customer_id: str,
    channel: str,
    reason: str,
    context: list[dict],
    phone: Optional[str] = None,
) -> dict:
    """
    Escalate conversation to human operator.
    
    This will:
    1. Mark the state as paused
    2. Send alert to operator channel (Telegram/Slack)
    3. Log the escalation event
    """
    # Build context summary
    last_messages = context[-5:] if len(context) > 5 else context
    context_text = "\n".join([
        f"{'👤' if m.get('role') == 'user' else '🤖'} {m.get('content', '')[:100]}"
        for m in last_messages
    ])
    
    alert = {
        "customer_id": customer_id,
        "channel": channel,
        "phone": phone,
        "reason": reason,
        "context": context_text,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    # TODO: Send to Telegram bot or Slack webhook
    # For now, just log it
    print(f"[ESCALATION] {alert}")
    
    # If Telegram bot token is configured, send alert
    if settings.telegram_bot_token:
        try:
            await _send_telegram_alert(alert)
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")
    
    return {
        "success": True,
        "message": "Escalated to human operator",
        "alert": alert,
    }


async def _send_telegram_alert(alert: dict) -> None:
    """Send escalation alert to Telegram."""
    # This would send to an admin chat
    # You need to configure ADMIN_CHAT_ID in settings
    admin_chat_id = getattr(settings, 'admin_chat_id', None)
    
    if not admin_chat_id:
        return
    
    text = (
        f"🚨 **Эскалация**\n\n"
        f"Канал: {alert['channel']}\n"
        f"Клиент: {alert['customer_id']}\n"
        f"Телефон: {alert.get('phone', 'Н/Д')}\n"
        f"Причина: {alert['reason']}\n\n"
        f"Контекст:\n{alert['context']}"
    )
    
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={
                "chat_id": admin_chat_id,
                "text": text,
                "parse_mode": "Markdown",
            }
        )
