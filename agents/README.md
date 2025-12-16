# Oysters31 Agents - Multi-Agent System

## Overview
Multi-agent system for processing omni-channel orders (Telegram, WhatsApp, VK, Instagram).

## Quick Start

```bash
# Install dependencies
pip install -e .

# Run development server
uvicorn src.main:app --reload --port 8001

# Or with Docker
docker-compose up -d
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## API Endpoints

- `POST /agents/run` - Process message through agent graph
- `GET /agents/state/{id}` - Get agent state
- `GET /healthz` - Health check

## Architecture

```
Supervisor → Sales Agent (product recommendations)
          → Checkout Agent (address, slot, order creation)
          → Support Agent (order status, escalation)
```
