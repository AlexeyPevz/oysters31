"""Redis client for state persistence and message queues."""

import json
from datetime import timedelta
from typing import Any, Optional

import redis.asyncio as redis

from src.config import settings


class RedisClient:
    """
    Redis client for:
    - Session/state storage with TTL
    - Message queue (Redis Streams)
    - Caching (products, delivery slots)
    """
    
    def __init__(self):
        self._client: Optional[redis.Redis] = None
    
    async def connect(self) -> None:
        """Connect to Redis."""
        self._client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        # Test connection
        await self._client.ping()
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()
    
    @property
    def client(self) -> redis.Redis:
        """Get Redis client."""
        if not self._client:
            raise RuntimeError("Redis not connected. Call connect() first.")
        return self._client
    
    # === State Management ===
    
    async def save_state(
        self,
        state_id: str,
        state: dict[str, Any],
        ttl_hours: int = 24,
    ) -> None:
        """Save agent state with TTL."""
        key = f"agent:state:{state_id}"
        await self.client.set(
            key,
            json.dumps(state, default=str),
            ex=timedelta(hours=ttl_hours),
        )
    
    async def get_state(self, state_id: str) -> Optional[dict[str, Any]]:
        """Get agent state by ID."""
        key = f"agent:state:{state_id}"
        data = await self.client.get(key)
        if data:
            return json.loads(data)
        return None
    
    async def delete_state(self, state_id: str) -> None:
        """Delete agent state."""
        key = f"agent:state:{state_id}"
        await self.client.delete(key)
    
    # === Customer Identity Mapping ===
    
    async def get_customer_id(
        self,
        channel: str,
        external_id: str,
    ) -> Optional[str]:
        """Get unified customer ID for channel+external_id."""
        key = f"customer:{channel}:{external_id}"
        return await self.client.get(key)
    
    async def set_customer_id(
        self,
        channel: str,
        external_id: str,
        unified_id: str,
    ) -> None:
        """Cache customer ID mapping."""
        key = f"customer:{channel}:{external_id}"
        await self.client.set(key, unified_id, ex=timedelta(days=30))
    
    # === Caching ===
    
    async def cache_products(
        self,
        products: list[dict],
        ttl_minutes: int = 5,
    ) -> None:
        """Cache available products."""
        key = "cache:products"
        await self.client.set(
            key,
            json.dumps(products, default=str),
            ex=timedelta(minutes=ttl_minutes),
        )
    
    async def get_cached_products(self) -> Optional[list[dict]]:
        """Get cached products."""
        key = "cache:products"
        data = await self.client.get(key)
        if data:
            return json.loads(data)
        return None
    
    async def cache_supply_dates(
        self,
        dates: list[str],
        ttl_minutes: int = 10,
    ) -> None:
        """Cache next supply dates."""
        key = "cache:supply_dates"
        await self.client.set(
            key,
            json.dumps(dates),
            ex=timedelta(minutes=ttl_minutes),
        )
    
    async def get_cached_supply_dates(self) -> Optional[list[str]]:
        """Get cached supply dates."""
        key = "cache:supply_dates"
        data = await self.client.get(key)
        if data:
            return json.loads(data)
        return None


# Global client instance
_redis_client: Optional[RedisClient] = None


async def get_redis() -> RedisClient:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
        await _redis_client.connect()
    return _redis_client


async def close_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
