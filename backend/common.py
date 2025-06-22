"""
Common utilities and base classes for all games
"""

import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMClient:
    """Wrapper for different LLM API clients"""
    
    def __init__(self, model_type: str):
        self.model_type = model_type.upper()
        self.client = self._initialize_client()
    
    def _initialize_client(self):
        if self.model_type == "OPENAI":
            import openai
            openai.api_key = os.getenv("OPENAI_API_KEY")
            return openai
        elif self.model_type == "ANTHROPIC":
            from anthropic import Anthropic
            return Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        elif self.model_type == "GEMINI":
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            return genai
        elif self.model_type == "GROQ":
            from groq import Groq
            return Groq(api_key=os.getenv("GROQ_API_KEY"))
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
    
    async def get_move(self, prompt: str) -> str:
        """Get a move from the LLM"""
        return await self.get_response(prompt)
    
    async def get_response(self, prompt: str) -> str:
        """Get a response from the LLM"""
        try:
            if self.model_type == "OPENAI":
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                response = await client.chat.completions.create(
                    model="gpt-4",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            
            elif self.model_type == "ANTHROPIC":
                import httpx
                api_key = os.getenv("ANTHROPIC_API_KEY")
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": api_key,
                            "Content-Type": "application/json",
                            "anthropic-version": "2023-06-01"
                        },
                        json={
                            "model": "claude-3-haiku-20240307",
                            "max_tokens": 150,
                            "messages": [{"role": "user", "content": prompt}]
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data["content"][0]["text"].strip()
                    else:
                        return "I apologize, but I'm unable to respond at the moment."
            
            elif self.model_type == "GEMINI":
                import google.generativeai as genai
                genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
                model = genai.GenerativeModel('gemini-pro')
                response = await model.generate_content_async(prompt)
                return response.text.strip()
            
            elif self.model_type == "GROQ":
                from groq import AsyncGroq
                client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
                response = await client.chat.completions.create(
                    model="mixtral-8x7b-32768",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            
            else:
                return "I'm a fallback response since the model is not configured."
                
        except Exception as e:
            print(f"Error getting response from {self.model_type}: {e}")
            return f"I apologize, but I encountered an error. Please try again."


class BaseGame(ABC):
    """Base class for all games"""
    
    def __init__(self, player1_model: str, player2_model: str):
        self.player1 = LLMClient(player1_model)
        self.player2 = LLMClient(player2_model)
        self.current_player = 1
        self.game_state = self.initialize_game()
        self.winner = None
        self.game_over = False
    
    @abstractmethod
    def initialize_game(self) -> Dict[str, Any]:
        """Initialize the game state"""
        pass
    
    @abstractmethod
    def make_move(self, move: str) -> bool:
        """Make a move and update game state"""
        pass
    
    @abstractmethod
    def check_winner(self) -> Optional[int]:
        """Check if there's a winner"""
        pass
    
    @abstractmethod
    def get_prompt_for_player(self, player: int) -> str:
        """Generate prompt for the current player"""
        pass
    
    @abstractmethod
    def is_valid_move(self, move: str) -> bool:
        """Check if a move is valid"""
        pass
    
    def switch_player(self):
        """Switch to the other player"""
        self.current_player = 3 - self.current_player  # Switches between 1 and 2
    
    async def play_turn(self) -> Dict[str, Any]:
        """Play one turn of the game"""
        # Get current player's LLM
        current_llm = self.player1 if self.current_player == 1 else self.player2
        
        # Generate prompt
        prompt = self.get_prompt_for_player(self.current_player)
        
        # Get move from LLM
        move = await current_llm.get_move(prompt)
        
        # Validate and make move
        if self.is_valid_move(move):
            self.make_move(move)
            
            # Check for winner
            self.winner = self.check_winner()
            if self.winner:
                self.game_over = True
            else:
                self.switch_player()
            
            return {
                "success": True,
                "move": move,
                "player": self.current_player,
                "game_state": self.game_state,
                "game_over": self.game_over,
                "winner": self.winner
            }
        else:
            return {
                "success": False,
                "error": "Invalid move",
                "move": move,
                "player": self.current_player
            } 