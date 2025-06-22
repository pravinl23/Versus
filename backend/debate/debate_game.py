"""
Voice-Powered AI Debate Arena Implementation
Integrates Vapi for speech-to-text and text-to-speech with LLM debate logic
"""

import asyncio
import time
import random
import os
import json
from typing import Dict, Any, List, Optional
from enum import Enum
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import BaseGame, LLMClient

class DebatePosition(Enum):
    PRO = "PRO"
    CON = "CON"

class DebateRoundType(Enum):
    OPENING = "opening"
    REBUTTAL = "rebuttal"
    CLOSING = "closing"

class VoiceDebateGame(BaseGame):
    """Voice-powered debate game where two LLMs engage in spoken arguments"""
    
    def __init__(self, player1_model: str, player2_model: str, topic: str, total_rounds: int = 6):
        self.topic = topic
        self.total_rounds = total_rounds
        self.current_round = 0
        self.current_speaker = 1  # 1 or 2
        
        # Randomly assign positions
        positions = [DebatePosition.PRO, DebatePosition.CON]
        random.shuffle(positions)
        self.player1_position = positions[0]
        self.player2_position = positions[1]
        
        # Debate state
        self.debate_transcript = []
        self.is_active = False
        self.debate_finished = False
        self.winner = None
        self.judge_reasoning = ""
        
        # Voice settings for each player
        self.player1_voice = "en-US-Studio-O"  # Male voice for differentiation
        self.player2_voice = "en-US-Studio-M"  # Female voice for differentiation
        
        # Timing
        self.debate_start_time = None
        self.round_times = []
        
        super().__init__(player1_model, player2_model)
    
    def initialize_game(self) -> Dict[str, Any]:
        """Initialize the debate game state"""
        self.debate_start_time = time.time()
        self.is_active = True
        
        return {
            "topic": self.topic,
            "total_rounds": self.total_rounds,
            "current_round": self.current_round,
            "current_speaker": self.current_speaker,
            "player1_position": self.player1_position.value,
            "player2_position": self.player2_position.value,
            "player1_voice": self.player1_voice,
            "player2_voice": self.player2_voice,
            "debate_active": self.is_active,
            "transcript": self.debate_transcript
        }
    
    async def start_debate_round(self) -> Dict[str, Any]:
        """Start the next round of debate"""
        if self.debate_finished or self.current_round >= self.total_rounds:
            return {"error": "Debate has finished"}
        
        round_start_time = time.time()
        
        # Determine round type
        round_type = self._get_round_type()
        
        # Get current speaker details
        current_model = self.player1 if self.current_speaker == 1 else self.player2
        current_position = self.player1_position if self.current_speaker == 1 else self.player2_position
        current_voice = self.player1_voice if self.current_speaker == 1 else self.player2_voice
        
        # Generate debate prompt
        prompt = self._generate_debate_prompt(current_position, round_type)
        
        # Get LLM response
        try:
            response_text = await self._get_llm_response(current_model, prompt)
            
            # Create Vapi call for text-to-speech
            audio_data = await self._create_vapi_speech(response_text, current_voice)
            
            # Store round data
            round_data = {
                "round": self.current_round + 1,
                "speaker": self.current_speaker,
                "position": current_position.value,
                "round_type": round_type.value,
                "text": response_text,
                "audio_url": audio_data.get("audio_url", ""),
                "audio_duration": audio_data.get("duration", 0),
                "timestamp": time.time(),
                "round_time": time.time() - round_start_time
            }
            
            self.debate_transcript.append(round_data)
            self.round_times.append(round_data["round_time"])
            
            # Advance to next speaker/round
            self._advance_debate()
            
            return {
                "success": True,
                "round_data": round_data,
                "debate_state": self._get_current_state(),
                "next_speaker": self.current_speaker if not self.debate_finished else None
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate debate response: {str(e)}"
            }
    
    async def _get_llm_response(self, model: LLMClient, prompt: str) -> str:
        """Get response from LLM for debate argument"""
        try:
            if model.model_type == "OPENAI":
                response = await model.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are a skilled debater. Be persuasive, logical, and engaging. Keep responses under 80 words."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=120,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            
            elif model.model_type == "ANTHROPIC":
                import asyncio
                import httpx
                
                api_key = os.getenv("ANTHROPIC_API_KEY")
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "Content-Type": "application/json",
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01"
                        },
                        json={
                            "model": "claude-3-haiku-20240307",
                            "max_tokens": 120,
                            "messages": [{"role": "user", "content": prompt}],
                            "system": "You are a skilled debater. Be persuasive, logical, and engaging. Keep responses under 80 words."
                        }
                    )
                    result = response.json()
                    if "content" in result and result["content"]:
                        return result["content"][0]["text"].strip()
                    else:
                        return f"API Error: {result}"
            
            elif model.model_type == "GEMINI":
                model_instance = model.client.GenerativeModel('gemini-pro')
                response = await model_instance.generate_content_async(
                    f"System: You are a skilled debater. Be persuasive, logical, and engaging. Keep responses under 80 words.\n\nUser: {prompt}"
                )
                return response.text.strip()
            
            elif model.model_type == "GROQ":
                response = await model.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are a skilled debater. Be persuasive, logical, and engaging. Keep responses under 80 words."},
                        {"role": "user", "content": prompt}
                    ],
                    model="mixtral-8x7b-32768",
                    max_tokens=120,
                    temperature=0.7
                )
                return response.choices[0].message.content.strip()
            
            else:
                return "Unsupported model type"
                
        except Exception as e:
            return f"LLM Error: {str(e)}"
    
    async def _create_vapi_speech(self, text: str, voice_id: str) -> Dict[str, Any]:
        """Create speech using Vapi TTS"""
        try:
            import httpx
            
            vapi_token = os.getenv("VAPI_API_KEY")
            if not vapi_token:
                return {"error": "Vapi API key not found"}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.vapi.ai/call",
                    headers={
                        "Authorization": f"Bearer {vapi_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "assistant": {
                            "model": {
                                "provider": "openai",
                                "model": "gpt-3.5-turbo",
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": f"Say exactly this: {text}"
                                    }
                                ]
                            },
                            "voice": {
                                "provider": "11labs",
                                "voiceId": voice_id
                            }
                        },
                        "phoneNumberId": None,  # For web-based calls
                        "customer": {
                            "number": None
                        }
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "audio_url": result.get("recordingUrl", ""),
                        "duration": result.get("endedReason", {}).get("duration", 0),
                        "call_id": result.get("id", "")
                    }
                else:
                    # Fallback: return text for frontend TTS
                    return {
                        "text": text,
                        "voice_id": voice_id,
                        "use_browser_tts": True
                    }
        
        except Exception as e:
            # Fallback: return text for frontend TTS
            return {
                "text": text,
                "voice_id": voice_id,
                "use_browser_tts": True,
                "error": str(e)
            }
    
    def _generate_debate_prompt(self, position: DebatePosition, round_type: DebateRoundType) -> str:
        """Generate appropriate prompt based on debate position and round type"""
        
        # Get previous opponent arguments for context
        opponent_arguments = []
        for entry in self.debate_transcript:
            if entry["speaker"] != self.current_speaker:
                opponent_arguments.append(entry["text"])
        
        base_prompt = f"""You are participating in a formal spoken debate. Your role is to argue {position.value} the following proposition: '{self.topic}'"""
        
        if round_type == DebateRoundType.OPENING:
            prompt = f"""{base_prompt}

This is your opening statement. Present your strongest arguments and establish your position clearly. Be persuasive, confident, and logical.

Respond in under 80 words. Be engaging and direct."""

        elif round_type == DebateRoundType.REBUTTAL:
            latest_opponent = opponent_arguments[-1] if opponent_arguments else "No previous arguments"
            prompt = f"""{base_prompt}

Your opponent just said:
'{latest_opponent}'

Your task is to counter their point, reinforce your position, and try to convince the audience. Address their specific claims while strengthening your own case.

Respond in under 80 words. Avoid repeating yourself. Be engaging and direct."""

        else:  # CLOSING
            all_opponent_args = " | ".join(opponent_arguments[-2:])  # Last 2 arguments
            prompt = f"""{base_prompt}

This is your closing statement. Summarize your position and deliver your most compelling final argument. 

Previous opponent arguments to address: '{all_opponent_args}'

Make this your strongest, most persuasive closing. Respond in under 80 words."""
        
        return prompt
    
    def _get_round_type(self) -> DebateRoundType:
        """Determine the type of round based on current round number"""
        if self.current_round < 2:  # First round for each speaker
            return DebateRoundType.OPENING
        elif self.current_round >= self.total_rounds - 2:  # Last round for each speaker
            return DebateRoundType.CLOSING
        else:
            return DebateRoundType.REBUTTAL
    
    def _advance_debate(self):
        """Advance to next speaker or end debate"""
        self.current_round += 1
        
        # Alternate speakers
        self.current_speaker = 2 if self.current_speaker == 1 else 1
        
        # Check if debate is finished
        if self.current_round >= self.total_rounds:
            self.debate_finished = True
            self.is_active = False
    
    async def judge_debate(self) -> Dict[str, Any]:
        """Use GPT-4 to judge the debate based on full transcript"""
        if not self.debate_finished:
            return {"error": "Debate is not finished yet"}
        
        # Compile full transcript for judging
        transcript_text = self._compile_transcript_for_judging()
        
        judge_prompt = f"""You are judging a formal debate on the topic: '{self.topic}'

Full debate transcript:
{transcript_text}

Evaluate both sides based on:
1. Logical consistency and strength of arguments
2. Effective rebuttals and counter-arguments  
3. Persuasive power and clarity
4. Overall debate performance

Who made the stronger case overall? Respond with:
- Winner: "PRO" or "CON"
- Reasoning: 1-2 sentences explaining your decision

Format: WINNER: [PRO/CON] | REASONING: [explanation]"""

        try:
            # Use a neutral LLM for judging (default to OpenAI)
            judge_client = LLMClient("OPENAI")
            response = await judge_client.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an impartial debate judge. Evaluate arguments objectively."},
                    {"role": "user", "content": judge_prompt}
                ],
                max_tokens=150,
                temperature=0.3
            )
            
            judgment = response.choices[0].message.content.strip()
            
            # Parse judgment
            if "WINNER:" in judgment and "REASONING:" in judgment:
                parts = judgment.split("|")
                winner_part = parts[0].strip()
                reasoning_part = parts[1].strip() if len(parts) > 1 else ""
                
                winner_position = winner_part.replace("WINNER:", "").strip()
                self.judge_reasoning = reasoning_part.replace("REASONING:", "").strip()
                
                # Determine which player won
                if winner_position == self.player1_position.value:
                    self.winner = 1
                elif winner_position == self.player2_position.value:
                    self.winner = 2
                else:
                    self.winner = None  # Tie or unclear
            
            return {
                "winner": self.winner,
                "winner_position": winner_position if 'winner_position' in locals() else None,
                "reasoning": self.judge_reasoning,
                "full_judgment": judgment
            }
            
        except Exception as e:
            return {"error": f"Failed to judge debate: {str(e)}"}
    
    def _compile_transcript_for_judging(self) -> str:
        """Compile the full debate transcript for judging"""
        transcript_lines = []
        
        for entry in self.debate_transcript:
            speaker_name = f"Speaker {entry['speaker']} ({entry['position']})"
            transcript_lines.append(f"{speaker_name}: {entry['text']}")
        
        return "\n\n".join(transcript_lines)
    
    def _get_current_state(self) -> Dict[str, Any]:
        """Get current debate state"""
        return {
            "topic": self.topic,
            "current_round": self.current_round,
            "total_rounds": self.total_rounds,
            "current_speaker": self.current_speaker,
            "debate_finished": self.debate_finished,
            "player1_position": self.player1_position.value,
            "player2_position": self.player2_position.value,
            "transcript_length": len(self.debate_transcript),
            "is_active": self.is_active
        }
    
    def get_final_results(self) -> Dict[str, Any]:
        """Get comprehensive final debate results"""
        total_time = time.time() - self.debate_start_time if self.debate_start_time else 0
        
        return {
            "debate_finished": True,
            "topic": self.topic,
            "winner": self.winner,
            "winner_position": (self.player1_position.value if self.winner == 1 
                              else self.player2_position.value if self.winner == 2 
                              else None),
            "judge_reasoning": self.judge_reasoning,
            "total_rounds": self.current_round,
            "total_time": total_time,
            "average_round_time": sum(self.round_times) / len(self.round_times) if self.round_times else 0,
            "full_transcript": self.debate_transcript,
            "player1_position": self.player1_position.value,
            "player2_position": self.player2_position.value
        }
    
    # Abstract method implementations (required by BaseGame)
    def make_move(self, move: str) -> bool:
        """Not used in debate - rounds are managed automatically"""
        return True
    
    def check_winner(self) -> Optional[int]:
        """Return current winner or None if debate not finished"""
        return self.winner if self.debate_finished else None
    
    def get_prompt_for_player(self, player: int) -> str:
        """Not used in debate - prompts are generated per round"""
        return ""
    
    def is_valid_move(self, move: str) -> bool:
        """All moves are valid in debate"""
        return True 