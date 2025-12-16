"""Redis Streams consumer for processing messages."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Callable, Optional

from src.db.redis import get_redis
from src.queue.producer import STREAM_NAME, CONSUMER_GROUP, ensure_consumer_group


logger = logging.getLogger(__name__)


class StreamConsumer:
    """
    Redis Streams consumer with:
    - Consumer groups for distributed processing
    - Automatic ACK on success
    - Retry with backoff on failure
    - Dead-letter queue for failed messages
    """
    
    MAX_RETRIES = 3
    BLOCK_MS = 5000  # Wait for new messages
    DLQ_STREAM = "agents:dlq"
    
    def __init__(
        self,
        consumer_name: str,
        handler: Callable[[dict[str, Any]], Any],
    ):
        self.consumer_name = consumer_name
        self.handler = handler
        self._running = False
    
    async def start(self) -> None:
        """Start consuming messages."""
        await ensure_consumer_group()
        self._running = True
        
        logger.info(f"Consumer {self.consumer_name} started")
        
        while self._running:
            try:
                await self._process_messages()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Consumer error: {e}")
                await asyncio.sleep(1)
    
    async def stop(self) -> None:
        """Stop consumer gracefully."""
        self._running = False
        logger.info(f"Consumer {self.consumer_name} stopping")
    
    async def _process_messages(self) -> None:
        """Read and process messages from stream."""
        redis_client = await get_redis()
        
        # Read new messages
        messages = await redis_client.client.xreadgroup(
            groupname=CONSUMER_GROUP,
            consumername=self.consumer_name,
            streams={STREAM_NAME: ">"},  # Only new messages
            count=10,
            block=self.BLOCK_MS,
        )
        
        if not messages:
            return
        
        for stream_name, entries in messages:
            for entry_id, data in entries:
                await self._handle_message(entry_id, data)
    
    async def _handle_message(
        self,
        entry_id: str,
        data: dict[str, Any],
    ) -> None:
        """Handle single message with retries."""
        message_id = data.get("message_id", entry_id)
        retry_count = int(data.get("retry_count", 0))
        
        try:
            # Parse metadata
            metadata = json.loads(data.get("metadata", "{}"))
            
            # Build message payload
            payload = {
                "channel": data.get("channel"),
                "external_id": data.get("external_id"),
                "customer_id": data.get("customer_id"),
                "message": data.get("message"),
                "metadata": metadata,
                "message_id": message_id,
            }
            
            # Call handler
            await self.handler(payload)
            
            # ACK on success
            redis_client = await get_redis()
            await redis_client.client.xack(STREAM_NAME, CONSUMER_GROUP, entry_id)
            
            logger.info(f"Processed message {message_id}")
            
        except Exception as e:
            logger.error(f"Failed to process {message_id}: {e}")
            await self._handle_failure(entry_id, data, retry_count, str(e))
    
    async def _handle_failure(
        self,
        entry_id: str,
        data: dict[str, Any],
        retry_count: int,
        error: str,
    ) -> None:
        """Handle failed message with retry or DLQ."""
        redis_client = await get_redis()
        
        if retry_count < self.MAX_RETRIES:
            # Retry with backoff
            await asyncio.sleep(2 ** retry_count)
            
            # Re-add with incremented retry count
            data["retry_count"] = str(retry_count + 1)
            data["last_error"] = error
            await redis_client.client.xadd(STREAM_NAME, data)
            
            # ACK original
            await redis_client.client.xack(STREAM_NAME, CONSUMER_GROUP, entry_id)
            
            logger.warning(f"Retrying message (attempt {retry_count + 1})")
        else:
            # Move to DLQ
            data["error"] = error
            data["failed_at"] = datetime.utcnow().isoformat()
            await redis_client.client.xadd(self.DLQ_STREAM, data)
            
            # ACK original
            await redis_client.client.xack(STREAM_NAME, CONSUMER_GROUP, entry_id)
            
            logger.error(f"Message {data.get('message_id')} moved to DLQ after {self.MAX_RETRIES} retries")


async def create_consumer(
    consumer_name: str,
    handler: Callable[[dict[str, Any]], Any],
) -> StreamConsumer:
    """Factory function to create a consumer."""
    return StreamConsumer(consumer_name, handler)
