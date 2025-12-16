"""LangGraph agent graph definition."""

import uuid
from typing import Any, Literal

from langgraph.graph import StateGraph, END

from src.agents.state import AgentRunRequest, AgentRunResponse, SeafoodBusinessState
from src.agents.nodes.supervisor import supervisor_node
from src.agents.nodes.sales import sales_node
from src.agents.nodes.checkout import checkout_node
from src.agents.nodes.support import support_node


# Define the graph state type for LangGraph
class GraphState(SeafoodBusinessState):
    """Extended state for LangGraph with additional fields."""
    pass


def route_after_supervisor(state: GraphState) -> Literal["sales", "checkout", "support", "end"]:
    """Route to the appropriate agent based on supervisor decision."""
    if state.escalate_to_human or state.is_paused_for_human:
        return "end"
    
    stage = state.current_stage
    if stage == "sales":
        return "sales"
    elif stage == "checkout":
        return "checkout"
    elif stage == "support":
        return "support"
    else:
        return "end"


def should_end(state: GraphState) -> Literal["supervisor", "end"]:
    """Determine if we should continue or end."""
    # After sales/checkout/support, we always end this turn
    return "end"


def build_graph() -> StateGraph:
    """Build the LangGraph state graph."""
    # Create graph with state schema
    graph = StateGraph(GraphState)
    
    # Add nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("sales", sales_node)
    graph.add_node("checkout", checkout_node)
    graph.add_node("support", support_node)
    
    # Set entry point
    graph.set_entry_point("supervisor")
    
    # Add conditional edges from supervisor
    graph.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "sales": "sales",
            "checkout": "checkout",
            "support": "support",
            "end": END,
        }
    )
    
    # All agent nodes go to END after processing
    graph.add_edge("sales", END)
    graph.add_edge("checkout", END)
    graph.add_edge("support", END)
    
    return graph


# Compile the graph
agent_graph = build_graph().compile()


async def run_agent(request: AgentRunRequest) -> AgentRunResponse:
    """
    Run the agent graph with the given request.
    
    This is the main entry point for processing messages.
    """
    # Initialize or restore state
    state = GraphState(
        customer_id=request.customer_id,
        channel=request.channel,
        messages=[{"role": "user", "content": request.message}],
        current_stage="greeting",
    )
    
    # Run the graph
    result = await agent_graph.ainvoke(state)
    
    # LangGraph returns dict with updated fields
    # Access results carefully - could be dict or Pydantic
    if isinstance(result, dict):
        messages = result.get("messages", [])
        current_stage = result.get("current_stage", "greeting")
        escalate = result.get("escalate_to_human", False)
    else:
        # Pydantic model
        messages = result.messages
        current_stage = result.current_stage
        escalate = result.escalate_to_human
    
    # Extract response from the last assistant message
    reply = ""
    for msg in reversed(messages):
        if isinstance(msg, dict) and msg.get("role") == "assistant":
            reply = msg.get("content", "")
            break
    
    if not reply:
        reply = "Извините, произошла ошибка. Попробуйте снова или напишите нам напрямую."
    
    # Generate state ID for continuation
    state_id = str(uuid.uuid4())
    
    return AgentRunResponse(
        reply=reply,
        state_id=state_id,
        current_stage=current_stage,
        escalate_to_human=escalate,
        cart_summary=None,  # TODO: Generate cart summary
        order_id=None,  # TODO: Return order ID if created
    )
