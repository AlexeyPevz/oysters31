"""Redis Streams producer for incoming messages."""

import json
from datetime import datetime
from typing import Any, Optional

from src.db.redis import get_redis


STREAM_NAME = "agents:incoming"
CONSUMER_GROUP = "agents-workers"


async def produce_message(
    channel: str,
    external_id: str,
    message: str,
    customer_id: str,
    metadata: Optional[dict[str, Any]] = None,
) -> str:
    """
    Add message to Redis Stream for processing.
    
    Returns:
        Message ID for tracking
    """
    redis_client = await get_redis()
    
    # Create unique message_id for idempotency
    message_id = f"{channel}:{external_id}:{int(datetime.utcnow().timestamp() * 1000)}"
    
    payload = {
        "message_id": message_id,
        "channel": channel,
        "external_id": external_id,
        "customer_id": customer_id,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "retry_count": "0",
        "metadata": json.dumps(metadata or {}),
    }
    
    # Add to stream
    stream_id = await redis_client.client.xadd(STREAM_NAME, payload)
    
    return stream_id


async def ensure_consumer_group() -> None:
    """
    Create consumer group if it doesn't exist.
    
    Call this on startup.
    """
    redis_client = await get_redis()
    
    try:
        await redis_client.client.xgroup_create(
            STREAM_NAME,
            CONSUMER_GROUP,
            id="0",  # Start from beginning
            mkstream=True,  # Create stream if doesn't exist
        )
    except Exception as e:
        # Group already exists
        if "BUSYGROUP" not in str(e):
            raise


async def get_pending_count() -> int:
    """Get count of pending messages in stream."""
    redis_client = await get_redis()
    
    try:
        info = await redis_client.client.xinfo_groups(STREAM_NAME)
        for group in info:
            if group.get("name") == CONSUMER_GROUP:
                return group.get("pending", 0)
    except Exception:
        pass
    
    return 0
