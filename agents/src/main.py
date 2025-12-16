"""FastAPI application entrypoint for the agents service."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.adapters.telegram import router as telegram_router
from src.adapters.whatsapp import router as whatsapp_router
from src.adapters.vk import router as vk_router
from src.adapters.instagram import router as instagram_router
from src.config import settings
from src.db.session import init_db, close_db
from src.db.redis import get_redis, close_redis
from src.queue.producer import ensure_consumer_group


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events."""
    # Startup
    await init_db()
    await get_redis()  # Initialize Redis connection
    await ensure_consumer_group()  # Create consumer group for streams
    yield
    # Shutdown
    await close_redis()
    await close_db()


app = FastAPI(
    title="Oysters31 Agents",
    description="Multi-Agent System for omni-channel seafood orders",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_hosts.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

# Channel adapters
app.include_router(telegram_router)
app.include_router(whatsapp_router)
app.include_router(vk_router)
app.include_router(instagram_router)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=settings.debug,
    )
