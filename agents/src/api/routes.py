"""API routes for the agents service."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.agents.graph import run_agent
from src.agents.state import AgentRunRequest, AgentRunResponse


router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/run", response_model=AgentRunResponse)
async def run_agent_endpoint(request: AgentRunRequest) -> AgentRunResponse:
    """
    Process a message through the agent graph.
    
    This is the main endpoint for all channel adapters (TG, WA, VK, IG).
    """
    try:
        result = await run_agent(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StateResponse(BaseModel):
    """Response model for state endpoint."""
    state_id: str
    state: dict[str, Any]


@router.get("/state/{state_id}", response_model=StateResponse)
async def get_state_endpoint(state_id: str) -> StateResponse:
    """Get agent state by ID for debugging/retry."""
    # TODO: Implement state retrieval from Redis
    raise HTTPException(status_code=501, detail="State retrieval not implemented yet")
