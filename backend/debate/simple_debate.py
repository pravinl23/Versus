"""
Simple AI Debate System
Clean, minimal implementation focusing on argument generation and Vapi voice integration
"""

import asyncio
import random
import os
import sys
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, '.env'))
sys.path.append(backend_dir)

from common import LLMClient

class SimpleDebate:
    """Minimal debate system - just argument generation and state"""
    
    def __init__(self, topic: str, model1: str, model2: str):
        self.topic = topic
        self.model1 = model1  # Pro side
        self.model2 = model2  # Con side
        
        # Simple state
        self.arguments = []  # List of all arguments
        self.current_turn = 1  # Whose turn (1 or 2)
        self.round_count = 0
        self.max_rounds = 6
        
        print(f"🎭 New debate: {topic}")
        print(f"📍 PRO: {model1} | CON: {model2}")
    
    async def generate_argument(self) -> Dict[str, Any]:
        """Generate next argument from current player"""
        if self.round_count >= self.max_rounds:
            return {"error": "Debate finished"}
        
        # Determine current player
        current_model = self.model1 if self.current_turn == 1 else self.model2
        position = "PRO" if self.current_turn == 1 else "CON"
        
        # Build simple prompt
        prompt = self._build_prompt(position)
        
        try:
            # Map model names to LLM types
            model_mapping = {
                "gpt-4o-mini": "OPENAI",
                "gpt-4o": "OPENAI",
                "claude-3-5-sonnet-20241022": "ANTHROPIC", 
                "gemini-1.5-flash": "GEMINI"
            }
            
            llm_type = model_mapping.get(current_model, "OPENAI")  # Default to OpenAI
            print(f"🤖 Using {llm_type} for {current_model}")
            
            # Get LLM response
            llm = LLMClient(llm_type)
            response = await llm.get_response(prompt)
            
            # Handle fallback response 
            if "apologize" in response and "error" in response:
                raise Exception(f"API call failed for {current_model}")
            
            # Clean up response
            argument = response.strip()
            if len(argument) > 300:
                argument = argument[:300] + "..."
            
            # Store argument
            arg_data = {
                "round": self.round_count + 1,
                "player": self.current_turn,
                "model": current_model,
                "position": position,
                "argument": argument,
                "topic": self.topic
            }
            
            self.arguments.append(arg_data)
            self.round_count += 1
            self.current_turn = 2 if self.current_turn == 1 else 1  # Switch turns
            
            print(f"✅ Generated argument {self.round_count}: {current_model} ({position})")
            
            return {
                "success": True,
                "argument": arg_data,
                "debate_finished": self.round_count >= self.max_rounds,
                "next_player": self.current_turn
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error generating argument: {error_msg}")
            
            # More helpful error messages
            if "api" in error_msg.lower() and "key" in error_msg.lower():
                return {"error": f"Missing API key for {current_model}. Please add API keys to backend/.env file."}
            elif "unknown model type" in error_msg.lower():
                return {"error": f"Model {current_model} not supported. Try: gpt-4o-mini, claude-3-5-sonnet-20241022"}
            else:
                return {"error": f"Failed to generate argument: {error_msg}"}
    
    def _build_prompt(self, position: str) -> str:
        """Build simple debate prompt"""
        
        # Get context from previous arguments
        context = ""
        if self.arguments:
            last_few = self.arguments[-2:]  # Last 2 arguments for context
            context = "\n".join([f"{arg['position']}: {arg['argument']}" for arg in last_few])
            context = f"\nPrevious arguments:\n{context}\n"
        
        prompt = f"""You are debating the topic: "{self.topic}"

Your position: You are arguing {position} ({"in favor of" if position == "PRO" else "against"}) this topic.
{context}
Instructions:
- Give a strong, persuasive argument for your position
- Keep it under 50 words
- Be direct and compelling
- If responding to opponent, address their points

Your argument:"""
        
        return prompt
    
    def get_state(self) -> Dict[str, Any]:
        """Get current debate state"""
        return {
            "topic": self.topic,
            "model1": self.model1,
            "model2": self.model2,
            "arguments": self.arguments,
            "current_turn": self.current_turn,
            "round_count": self.round_count,
            "max_rounds": self.max_rounds,
            "finished": self.round_count >= self.max_rounds
        }

# Global storage for active debates
active_debates: Dict[str, SimpleDebate] = {} 