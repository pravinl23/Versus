"""
Debate Game Implementation
Integrates with the main server for AI debates
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

from ...utils.common import BaseGame, LLMClient

logger = logging.getLogger(__name__)

# Define GameStatus enum since it's not in common.py
class GameStatus(Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"

@dataclass
class DebateArgument:
    """Represents a single debate argument"""
    round: int
    position: str  # PRO or CON
    model: str
    argument: str

class DebateGame(BaseGame):
    """AI Debate Game Implementation"""
    
    def __init__(self, game_id: str, player1_model: str, player2_model: str):
        # Initialize LLM clients first
        self.player1_model = player1_model
        self.player2_model = player2_model
        
        # Call parent class init
        super().__init__(player1_model, player2_model, use_async=False)
        
        # Debate specific attributes
        self.game_id = game_id
        self.game_type = "debate"
        self.topic = ""
        self.judge_model = "gpt-4o"  # Hardcoded judge
        self.arguments: List[DebateArgument] = []
        self.current_round = 0
        self.max_rounds = 6
        self.current_position = "PRO"  # PRO starts first
        self.judgment = None
        self.debate_finished = False
        self.websocket = None  # Will be set by server
        self.status = GameStatus.WAITING
        
        logger.info(f"Created debate game {game_id}")
    
    def initialize_game(self) -> Dict[str, Any]:
        """Initialize the game state (required by BaseGame)"""
        return {
            "topic": "",
            "arguments": [],
            "current_round": 0,
            "status": GameStatus.WAITING.value
        }
    
    def make_move(self, move: str) -> bool:
        """Make a move - not used in debate as it's automatic"""
        return True
    
    def check_winner(self) -> Optional[int]:
        """Check if there's a winner"""
        if self.judgment and "winner" in self.judgment:
            return 1 if self.judgment["winner"] == "PRO" else 2
        return None
    
    def get_prompt_for_player(self, player: int) -> str:
        """Generate prompt for the current player"""
        position = "PRO" if player == 1 else "CON"
        return self._build_argument_prompt(position)
    
    def is_valid_move(self, move: str) -> bool:
        """Check if a move is valid - always true for debate"""
        return True
    
    async def initialize(self, topic: str, judge_model: str = None):
        """Initialize the debate with a topic"""
        self.topic = topic
        if judge_model:
            self.judge_model = judge_model
        
        self.status = GameStatus.IN_PROGRESS
        logger.info(f"Debate initialized with topic: {topic}")
        
        # Send initial state
        await self.broadcast_state({
            "type": "debate_created",
            "topic": self.topic,
            "judge_model": self.judge_model
        })
        
        # Start the debate loop
        asyncio.create_task(self.run_debate())
    
    async def run_debate(self):
        """Run the automatic debate"""
        try:
            while self.current_round < self.max_rounds and self.status == GameStatus.IN_PROGRESS:
                # Generate argument for current position
                await self.generate_argument()
                
                # Small delay between arguments
                await asyncio.sleep(2)
                
                # Switch positions
                self.current_position = "CON" if self.current_position == "PRO" else "PRO"
                
                # Increment round after both have spoken
                if self.current_position == "PRO":
                    self.current_round += 1
            
            # Debate finished
            self.debate_finished = True
            await self.broadcast_state({"type": "debate_finished"})
            
            # Judge the debate
            await asyncio.sleep(2)
            await self.judge_debate()
            
        except Exception as e:
            logger.error(f"Error in debate loop: {e}")
            await self.broadcast_state({
                "type": "error",
                "message": str(e)
            })
    
    async def generate_argument(self):
        """Generate an argument for the current position"""
        try:
            # Determine which model to use
            current_model = self.player1_model if self.current_position == "PRO" else self.player2_model
            
            # Build prompt
            prompt = self._build_argument_prompt(self.current_position)
            
            # Get LLM response
            llm_client = LLMClient(current_model)
            response = llm_client.get_response(prompt, max_tokens=150)
            
            if not response:
                raise Exception("Failed to get response from LLM")
            
            # Create argument
            argument = DebateArgument(
                round=self.current_round + 1,
                position=self.current_position,
                model=current_model,
                argument=response.strip()
            )
            
            self.arguments.append(argument)
            
            # Broadcast the new argument
            await self.broadcast_state({
                "type": "argument_generated",
                "argument": {
                    "round": argument.round,
                    "position": argument.position,
                    "model": argument.model,
                    "argument": argument.argument
                }
            })
            
            logger.info(f"Generated {self.current_position} argument for round {argument.round}")
            
        except Exception as e:
            logger.error(f"Error generating argument: {e}")
            raise
    
    def _build_argument_prompt(self, position: str) -> str:
        """Build prompt for argument generation"""
        # Get previous arguments for context
        context = ""
        if self.arguments:
            recent_args = self.arguments[-3:]  # Last 3 arguments
            context = "\n".join([
                f"{arg.position}: {arg.argument}" 
                for arg in recent_args
            ])
            context = f"\n\nRecent arguments:\n{context}\n"
        
        prompt = f"""You are debating the topic: "{self.topic}"

Your position: You are arguing {position} ({"in favor of" if position == "PRO" else "against"}) this topic.
{context}
Instructions:
- Give a strong, persuasive argument for your position
- Keep it concise (under 100 words)
- Be direct and compelling
- If responding to opponent, address their key points
- Focus on logic and evidence

Your argument:"""
        
        return prompt
    
    async def judge_debate(self):
        """Judge the completed debate"""
        try:
            # Prepare transcript
            transcript = f"DEBATE TOPIC: {self.topic}\n\n"
            
            pro_args = [arg for arg in self.arguments if arg.position == "PRO"]
            con_args = [arg for arg in self.arguments if arg.position == "CON"]
            
            for i in range(max(len(pro_args), len(con_args))):
                if i < len(pro_args):
                    transcript += f"PRO ARGUMENT {i+1}: {pro_args[i].argument}\n\n"
                if i < len(con_args):
                    transcript += f"CON ARGUMENT {i+1}: {con_args[i].argument}\n\n"
            
            # Create judging prompt
            judge_prompt = f"""You are an expert debate judge. Evaluate this debate and provide scores.

{transcript}

Score each side on these criteria (each out of the points shown):
1. Argumentative Structure (30 points)
2. Depth of Justification (20 points)
3. Rebuttal Effectiveness (30 points)
4. Topical Relevance (20 points)

Respond with this JSON format:
{{
  "pro_scores": {{
    "structure": {{"score": X, "reasoning": "brief reason"}},
    "depth": {{"score": X, "reasoning": "brief reason"}},
    "rebuttal": {{"score": X, "reasoning": "brief reason"}},
    "relevance": {{"score": X, "reasoning": "brief reason"}}
  }},
  "con_scores": {{
    "structure": {{"score": X, "reasoning": "brief reason"}},
    "depth": {{"score": X, "reasoning": "brief reason"}},
    "rebuttal": {{"score": X, "reasoning": "brief reason"}},
    "relevance": {{"score": X, "reasoning": "brief reason"}}
  }},
  "winner": "PRO or CON",
  "margin": "X points",
  "overall_analysis": "Brief analysis of why the winner won"
}}"""
            
            # Get judgment
            judge_client = LLMClient(self.judge_model)
            response = judge_client.get_response(judge_prompt, max_tokens=500)
            
            if not response:
                raise Exception("Failed to get judgment from LLM")
            
            # Parse JSON
            try:
                # Extract JSON from response
                json_start = response.find('{')
                json_end = response.rfind('}') + 1
                json_text = response[json_start:json_end]
                
                judgment_data = json.loads(json_text)
                
                # Calculate totals
                pro_total = sum(
                    judgment_data['pro_scores'][cat]['score'] 
                    for cat in judgment_data['pro_scores']
                )
                con_total = sum(
                    judgment_data['con_scores'][cat]['score'] 
                    for cat in judgment_data['con_scores']
                )
                
                judgment_data['pro_total'] = pro_total
                judgment_data['con_total'] = con_total
                
                self.judgment = judgment_data
                self.status = GameStatus.FINISHED
                
                # Broadcast judgment
                await self.broadcast_state({
                    "type": "judgment_complete",
                    "judgment": judgment_data
                })
                
                logger.info(f"Debate judged: {judgment_data['winner']} wins")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse judgment: {e}")
                # Create simple judgment
                self.judgment = {
                    "winner": "TIE",
                    "margin": "0 points",
                    "overall_analysis": "Unable to determine clear winner",
                    "pro_total": 50,
                    "con_total": 50,
                    "pro_scores": {
                        "structure": {"score": 15, "reasoning": "N/A"},
                        "depth": {"score": 10, "reasoning": "N/A"},
                        "rebuttal": {"score": 15, "reasoning": "N/A"},
                        "relevance": {"score": 10, "reasoning": "N/A"}
                    },
                    "con_scores": {
                        "structure": {"score": 15, "reasoning": "N/A"},
                        "depth": {"score": 10, "reasoning": "N/A"},
                        "rebuttal": {"score": 15, "reasoning": "N/A"},
                        "relevance": {"score": 10, "reasoning": "N/A"}
                    }
                }
                await self.broadcast_state({
                    "type": "judgment_complete",
                    "judgment": self.judgment
                })
            
        except Exception as e:
            logger.error(f"Error judging debate: {e}")
            await self.broadcast_state({
                "type": "error",
                "message": f"Failed to judge debate: {str(e)}"
            })
    
    def get_state(self) -> Dict[str, Any]:
        """Get current game state"""
        return {
            "game_id": self.game_id,
            "game_type": self.game_type,
            "status": self.status.value,
            "topic": self.topic,
            "arguments": [
                {
                    "round": arg.round,
                    "position": arg.position,
                    "model": arg.model,
                    "argument": arg.argument
                }
                for arg in self.arguments
            ],
            "current_round": self.current_round,
            "max_rounds": self.max_rounds,
            "judgment": self.judgment,
            "debate_finished": self.debate_finished
        }

    async def broadcast_state(self, data: Dict[str, Any]):
        """Broadcast state update via WebSocket"""
        if self.websocket:
            try:
                await self.websocket.send_json(data)
            except Exception as e:
                logger.error(f"Error broadcasting state: {e}") 