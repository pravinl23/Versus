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
            from openai import AsyncOpenAI
            return AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        elif self.model_type == "ANTHROPIC":
            from anthropic import AsyncAnthropic
            return AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        elif self.model_type == "GEMINI":
            import google.generativeai as genai
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            return genai
        elif self.model_type == "GROQ":
            from groq import AsyncGroq
            return AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
    
    async def get_move(self, prompt: str) -> str:
        """Get a move from the LLM"""
        # This method is implemented in the individual game classes
        # Each game handles LLM queries differently
        raise NotImplementedError("Implement in individual game classes")


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