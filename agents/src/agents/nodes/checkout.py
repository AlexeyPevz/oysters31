"""Checkout agent node - order finalization and creation."""

import json
from typing import Any
from datetime import datetime

from src.llm.client import get_llm_response
from src.llm.prompts import CHECKOUT_PROMPT
from src.agents.state import SeafoodBusinessState, DeliveryAddress
from src.tools.order import create_order
from src.db.session import async_session_maker


async def checkout_node(state: SeafoodBusinessState) -> dict[str, Any]:
    """
    Checkout agent that handles order finalization.
    Executes make_order tool if called.
    """
    messages = list(state.messages)
    cart = list(state.cart)
    # Convert Pydantic model to dict for tools/logic if needed, or access directly
    delivery_address = state.delivery_address
    
    async with async_session_maker() as session:
        if not cart:
            return {
                "messages": messages + [{"role": "assistant", "content": "Корзина пуста."}],
                "current_stage": "sales"
            }

        # Build context
        system_prompt = CHECKOUT_PROMPT
        
        cart_text = "\n".join([
            f"- {item.name}: {item.quantity} x {item.unit_price}₽"
            for item in cart
        ])
        total = sum(item.quantity * item.unit_price for item in cart)
        context = f"\n\nКорзина:\n{cart_text}\n\nИтого: {total}₽"
        
        if delivery_address:
            addr_text = f"{delivery_address.street}, д. {delivery_address.house}"
            context += f"\n\nАдрес доставки: {addr_text}"
        
        system_prompt += context
        
        # Call LLM
        response = await get_llm_response(
            system_prompt=system_prompt,
            messages=messages,
            tools=["create_order", "calculate_delivery_fee"],
        )
        
        # Handle tools
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
                    try: 
                        args = json.loads(args)
                    except: 
                        pass
                
                tool_result = None
                
                if function_name == "create_order":
                    # Need address from args or state
                    # Taking from state is safer if LLM validated it
                    if not delivery_address and "address" in args:
                        # Parse address from args if provided
                        delivery_address = DeliveryAddress(**args["address"])
                    
                    if delivery_address:
                        # Convert Pydantic items to dicts for tool
                        cart_dicts = [item.model_dump() for item in cart]
                        
                        tool_result = await create_order(
                            session=session,
                            customer_id=state.customer_id,
                            cart=cart_dicts,
                            address=delivery_address, # Pass object
                            delivery_date=datetime.now(), # Placeholder or from args
                            slot="DAY", # Placeholder
                            channel=state.channel,
                            phone=state.phone
                        )
                        # Order created!
                        # Clear cart?
                        cart = [] 
                    else:
                        tool_result = {"error": "Delivery address missing"}

                messages.append({
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(tool_result, default=str)
                })
            
            # Final response
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
            "cart": cart,
            "delivery_address": delivery_address,
            "current_stage": "checkout" # Or end?
        }
