"""Identity resolution - link customers across channels."""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import CustomerIdentity, MessageChannel, Client
from src.db.redis import get_redis


async def resolve_customer_id(
    session: AsyncSession,
    channel: str,
    external_id: str,
    phone: Optional[str] = None,
    email: Optional[str] = None,
) -> str:
    """
    Resolve or create unified customer ID.
    
    Logic:
    1. Check if this channel+external_id already has a unified ID
    2. If not, try to match by phone or email
    3. If still not found, create new unified ID
    
    Args:
        session: Database session
        channel: Message channel (telegram, whatsapp, etc)
        external_id: External ID in the channel
        phone: Optional phone number for matching
        email: Optional email for matching
    
    Returns:
        Unified customer ID
    """
    redis_client = await get_redis()
    channel_enum = MessageChannel[channel.upper()]
    
    # 1. Check Redis cache first
    cached_id = await redis_client.get_customer_id(channel, external_id)
    if cached_id:
        return cached_id
    
    # 2. Check database for existing identity
    query = select(CustomerIdentity).where(
        CustomerIdentity.channel == channel_enum,
        CustomerIdentity.external_id == external_id,
    )
    result = await session.execute(query)
    identity = result.scalar_one_or_none()
    
    if identity:
        # Cache and return
        await redis_client.set_customer_id(channel, external_id, identity.unified_customer_id)
        return identity.unified_customer_id
    
    # 3. Try to match by phone
    unified_id = None
    if phone:
        query = select(CustomerIdentity).where(CustomerIdentity.phone == phone)
        result = await session.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            unified_id = existing.unified_customer_id
    
    # 4. Try to match by email
    if not unified_id and email:
        query = select(CustomerIdentity).where(CustomerIdentity.email == email)
        result = await session.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            unified_id = existing.unified_customer_id
    
    # 5. Try to match against clients table
    if not unified_id and phone:
        client_query = select(Client).where(Client.phone == phone)
        client_result = await session.execute(client_query)
        client = client_result.scalar_one_or_none()
        if client:
            # Create unified ID from client
            unified_id = f"client:{client.id}"
    
    # 6. Generate new unified ID if no match
    if not unified_id:
        unified_id = str(uuid.uuid4())
    
    # 7. Create new identity record
    new_identity = CustomerIdentity(
        id=str(uuid.uuid4())[:25],
        unified_customer_id=unified_id,
        channel=channel_enum,
        external_id=external_id,
        phone=phone,
        email=email,
    )
    session.add(new_identity)
    await session.commit()
    
    # Cache the mapping
    await redis_client.set_customer_id(channel, external_id, unified_id)
    
    return unified_id


async def link_phone_to_customer(
    session: AsyncSession,
    unified_id: str,
    phone: str,
) -> None:
    """
    Link phone number to existing customer identity.
    
    Updates all identities with this unified_id.
    """
    query = select(CustomerIdentity).where(
        CustomerIdentity.unified_customer_id == unified_id
    )
    result = await session.execute(query)
    identities = result.scalars().all()
    
    for identity in identities:
        if not identity.phone:
            identity.phone = phone
    
    await session.commit()


async def get_customer_channels(
    session: AsyncSession,
    unified_id: str,
) -> list[dict]:
    """Get all channels linked to a customer."""
    query = select(CustomerIdentity).where(
        CustomerIdentity.unified_customer_id == unified_id
    )
    result = await session.execute(query)
    identities = result.scalars().all()
    
    return [
        {
            "channel": i.channel.value,
            "external_id": i.external_id,
            "phone": i.phone,
            "email": i.email,
        }
        for i in identities
    ]
