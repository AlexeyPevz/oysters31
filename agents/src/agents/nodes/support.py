"""Support agent node - order status and escalation."""

import json
from typing import Any

from src.llm.client import get_llm_response
from src.llm.prompts import SUPPORT_PROMPT
from src.agents.state import SeafoodBusinessState
from src.tools.order import get_order_status
from src.tools.escalate import escalate_to_human
from src.db.session import async_session_maker


async def support_node(state: SeafoodBusinessState) -> dict[str, Any]:
    """
    Support agent that handles order status and complaints.
    """
    messages = list(state.messages)
    escalate = state.escalate_to_human
    phone = state.phone
    
    async with async_session_maker() as session:
        # Check explicit escalation
        if escalate:
             # Already handled in Supervisor or previous turn, but if we land here:
             return {"is_paused_for_human": True}

        system_prompt = SUPPORT_PROMPT
        if phone:
            system_prompt += f"\n\nТелефон клиента: {phone}"
        
        response = await get_llm_response(
            system_prompt=system_prompt,
            messages=messages,
            tools=["get_order_status", "escalate_to_human"],
        )
        
        if response.get("tool_calls"):
            tool_calls = response["tool_calls"]
            messages.append({
                "role": "assistant",
                "content": response.get("content", ""),
                "tool_calls": tool_calls
            })
            
            for tool_call in tool_calls:
                function_name = tool_call.get("name")
                args = tool_call.get("arguments", {})
                if isinstance(args, str):
                    try: args = json.loads(args)
                    except: pass
                
                tool_result = None
                
                if function_name == "get_order_status":
                    tool_result = await get_order_status(
                        session,
                        phone=phone,
                        order_number=args.get("order_number")
                    )
                elif function_name == "escalate_to_human":
                    tool_result = await escalate_to_human(
                        customer_id=state.customer_id,
                        channel=state.channel,
                        reason=args.get("reason", "User requested"),
                        context=messages,
                        phone=phone
                    )
                    escalate = True
                
                messages.append({
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(tool_result, default=str)
                })
            
            final_response = await get_llm_response(
                system_prompt=system_prompt,
                messages=messages
            )
            messages.append({
                "role": "assistant",
                "content": final_response.get("content", "")
            })
        else:
             messages.append({
                "role": "assistant",
                "content": response.get("content", "")
            })
            
        return {
            "messages": messages,
            "escalate_to_human": escalate,
            "current_stage": "support"
        }
