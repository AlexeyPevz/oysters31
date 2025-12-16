"""Sales agent node - product recommendations and cart management."""

import json
from typing import Any

from src.llm.client import get_llm_response
from src.llm.prompts import SALES_PROMPT
from src.agents.state import SeafoodBusinessState
from src.tools.stock import check_stock, get_product_price
from src.tools.cart import add_to_cart
from src.db.session import async_session_maker


async def sales_node(state: SeafoodBusinessState) -> dict[str, Any]:
    """
    Sales agent that handles product inquiries and recommendations.
    Uses ReAct pattern: LLM -> Tool -> LLM.
    """
    # Convert Pydantic state to access fields easier in loop
    messages = list(state.messages)
    cart = list(state.cart)
    
    # Get database session for tools
    async with async_session_maker() as session:
        # 1. First LLM call
        system_prompt = SALES_PROMPT
        
        # Add cart context
        if cart:
            cart_text = "\n".join([
                f"- {item.name}: {item.quantity} x {item.unit_price}₽"
                for item in cart
            ])
            system_prompt += f"\n\nТекущая корзина клиента:\n{cart_text}"
        
        response = await get_llm_response(
            system_prompt=system_prompt,
            messages=messages,
            tools=["check_stock", "get_product_price", "add_to_cart"],
        )
        
        # 2. Handle Tool Calls
        if response.get("tool_calls"):
            tool_calls = response["tool_calls"]
            
            # Append assistant message with tool calls
            messages.append({
                "role": "assistant",
                "content": response.get("content", "") or "Thinking...",
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
                
                # Execute tools
                if function_name == "check_stock":
                    tool_result = await check_stock(
                        session, 
                        product_name=args.get("product_name"),
                        delivery_date=args.get("delivery_date")
                    )
                elif function_name == "get_product_price":
                    tool_result = await get_product_price(
                        session,
                        product_id=args.get("product_id")
                    )
                elif function_name == "add_to_cart":
                    # For add_to_cart, we need to handle it specially as it updates state
                    # We first get price validation
                    price_info = await get_product_price(session, args.get("product_id"))
                    
                    if price_info.get("found"):
                        # Use updated state.cart
                        temp_state = {"cart": [item.model_dump() for item in cart]}
                        result_state = add_to_cart(
                            temp_state,
                            product_id=args.get("product_id"),
                            name=price_info["name"],
                            quantity=int(args.get("quantity", 1)),
                            unit=price_info["unit"],
                            unit_price=price_info["price"]
                        )
                        # Update local cart variable
                        cart_dicts = result_state["cart"]
                        # We need to reflect this in the final return
                        # But for the conversation, we just say "added"
                        tool_result = {"success": True, "message": "Item added to cart"}
                        
                        # IMPORTANT: We must return the new cart in the final state
                        # We'll re-construct cart objects at standard return
                        from src.agents.state import CartItem
                        cart = [CartItem(**c) for c in cart_dicts]
                    else:
                        tool_result = {"error": "Product not found"}
                
                # Append tool result
                messages.append({
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(tool_result, default=str),
                    "tool_call_id": tool_call.get("id")
                })
            
            # 3. Second LLM call (generate final response)
            final_response = await get_llm_response(
                system_prompt=system_prompt,
                messages=messages,
                tools=None, # Don't loop infinitely for now
            )
            
            messages.append({
                "role": "assistant",
                "content": final_response.get("content", "")
            })
            
        else:
            # No tools, just append response
            messages.append({
                "role": "assistant",
                "content": response.get("content", "")
            })
            
        return {
            "messages": messages,
            "cart": cart,
            "current_stage": "sales",  # Stay in sales
        }
