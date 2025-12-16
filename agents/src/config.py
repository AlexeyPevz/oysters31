"""Configuration settings for the agents service."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "mysql+aiomysql://oysters:oysters123@localhost:3306/oysters"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM Keys
    gemini_api_key: str = ""
    openrouter_api_key: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    admin_chat_id: str = ""  # For escalation alerts

    # WhatsApp Cloud API
    whatsapp_api_token: str = ""  # Permanent token from Meta Business
    whatsapp_phone_number_id: str = ""  # Phone Number ID
    whatsapp_verify_token: str = ""  # Webhook verification token
    whatsapp_webhook_secret: str = ""  # App secret for signature verification

    # VK
    vk_api_token: str = ""  # Community token with messages permission
    vk_group_id: int = 0  # Community/group ID
    vk_confirmation_code: str = ""  # Callback API confirmation code
    vk_secret_key: str = ""  # Secret key for webhook verification

    # Instagram Graph API
    instagram_page_token: str = ""  # Page Access Token
    instagram_app_secret: str = ""  # App secret for signature
    instagram_verify_token: str = ""  # Webhook verification token

    # Service
    service_host: str = "0.0.0.0"
    service_port: int = 8001
    debug: bool = True

    # Security
    hmac_secret: str = ""
    allowed_hosts: str = "localhost,127.0.0.1"

    # LLM Settings
    llm_max_tokens: int = 2048
    llm_timeout: int = 30
    llm_temperature: float = 0.7

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
