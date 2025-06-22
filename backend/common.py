"""
Common utilities and base classes for all games
"""

import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv()

class LLMClient:
    """Wrapper for different LLM API clients"""
    
    def __init__(self, model_type: str, use_async: bool = False):
        self.model_type = model_type.upper()
        self.use_async = use_async
        self.client = self._initialize_client()
    
    def _initialize_client(self):
        if self.model_type == "OPENAI":
            if self.use_async:
                from openai import AsyncOpenAI
                return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            else:
                from openai import OpenAI
                return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        elif self.model_type == "ANTHROPIC":
            if self.use_async:
                from anthropic import AsyncAnthropic
                return AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            else:
                from anthropic import Anthropic
                return Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        elif self.model_type == "GEMINI":
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            return genai
        elif self.model_type == "GROQ":
            if self.use_async:
                from groq import AsyncGroq
                return AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
            else:
                from groq import Groq
                return Groq(api_key=os.getenv("GROQ_API_KEY"))
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
    
    def get_move(self, prompt: str, game_state: dict = None) -> str:
        """Get a move from the LLM (sync version for battleship)"""
        try:
            if self.model_type == "OPENAI":
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",  # Using a faster model for games
                    messages=[
                        {"role": "system", "content": "You are an expert battleship player. Respond with ONLY the coordinate (e.g. 'A5' or 'H8'). No other text."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=10  # Reduced since we only need a coordinate
                )
                content = response.choices[0].message.content.strip()
                
            elif self.model_type == "ANTHROPIC":
                response = self.client.messages.create(
                    model="claude-3-haiku-20240307",  # Using a faster model for games
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=10,
                    temperature=0.7
                )
                content = response.content[0].text.strip()
                
            elif self.model_type == "GROQ":
                response = self.client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[
                        {"role": "system", "content": "You are an expert battleship player. Respond with ONLY the coordinate (e.g. 'A5' or 'H8'). No other text."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=10
                )
                content = response.choices[0].message.content.strip()
                
            elif self.model_type == "GEMINI":
                model = self.client.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                content = response.text.strip()
                
            else:
                # Fallback for testing - make random valid moves
                import random
                import string
                col = random.choice(string.ascii_uppercase[:8])
                row = random.randint(1, 8)
                return f"{col}{row}"
            
            # Clean up the response - extract just the coordinate
            import re
            # Look for pattern like A5, H8, etc.
            coord_match = re.search(r'[A-Ha-h][1-8]', content)
            if coord_match:
                return coord_match.group(0).upper()
            
            # If no valid coordinate found, try to extract any letter-number combo
            parts = re.findall(r'[A-Ha-h]|[1-8]', content)
            if len(parts) >= 2:
                return parts[0].upper() + parts[1]
            
            # Last resort - return the whole content
            return content.upper()
                
        except Exception as e:
            print(f"Error getting move from {self.model_type}: {e}")
            # Return a fallback move
            import random
            import string
            col = random.choice(string.ascii_uppercase[:8])
            row = random.randint(1, 8)
            return f"{col}{row}"
    
    async def get_move_async(self, prompt: str, game_state: dict = None) -> str:
        """Get a move from the LLM (async version for other games)"""
        # This method can be implemented for async games
        # For now, it raises NotImplementedError to maintain compatibility with main branch
        raise NotImplementedError("Async move generation should be implemented in individual game classes")


class BaseGame(ABC):
    """Base class for all games"""
    
    def __init__(self, player1_model: str, player2_model: str, use_async: bool = False):
        self.player1 = LLMClient(player1_model, use_async)
        self.player2 = LLMClient(player2_model, use_async)
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
    
    def play_turn(self) -> Dict[str, Any]:
        """Play one turn of the game"""
        # Get current player's LLM
        current_llm = self.player1 if self.current_player == 1 else self.player2
        
        # Generate prompt
        prompt = self.get_prompt_for_player(self.current_player)
        
        # Try to get a valid move (with retries)
        max_retries = 3
        for attempt in range(max_retries):
            # Get move from LLM
            move = current_llm.get_move(prompt)
            
            # Clean up the move (remove extra text if any)
            move = move.split()[0] if move else ""
            
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
        
        # If we couldn't get a valid move after retries
        return {
            "success": False,
            "error": "Could not get valid move after retries",
            "player": self.current_player
        }