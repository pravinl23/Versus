"""
Letta Service for AI Personality Management in Versus
Handles memory, rivalries, and post-game interviews
"""

import os
import json
import random
import time
import asyncio
from typing import Dict, Optional, List, Any
from dotenv import load_dotenv

# Load environment variables from backend/.env
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # Go up 3 levels from src/services/letta_service.py
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

try:
    from letta_client import Letta
except ImportError:
    print("⚠️  letta-client not installed. Run: pip install letta-client")
    Letta = None

import httpx

class LettaPersonalityService:
    def __init__(self):
        """Initialize Letta client and personality management"""
        self.letta_client = None
        self.model_personalities = {}
        self.game_stats = {}  # Track wins/losses for rivalries
        self.initialized = False
        
        # Initialize Letta client
        self._init_letta_client()
    
    def _init_letta_client(self):
        """Initialize Letta client with proper error handling"""
        if not Letta:
            print("⚠️  Letta client not available - install letta-client")
            return
        
        try:
            letta_api_key = os.getenv("LETTA_API_KEY")
            letta_base_url = os.getenv("LETTA_BASE_URL", "https://api.letta.com")
            
            if not letta_api_key:
                print("⚠️  LETTA_API_KEY not found - personality features disabled")
                return
            
            if "heree" in letta_api_key:
                print("⚠️  Please fix the typo in LETTA_API_KEY and add your real key")
                return
            
            self.letta_client = Letta(token=letta_api_key)
            print("✅ Letta client initialized successfully")
            
        except Exception as e:
            print(f"❌ Failed to initialize Letta client: {e}")
    
    async def initialize_personalities(self):
        """Create Letta agents for each AI model with unique personalities"""
        if not self.letta_client:
            print("❌ Letta client is None - cannot initialize personalities")
            return
            
        if self.initialized:
            print("✅ Letta personas already initialized")
            return
            
        print("🎭 Starting personality initialization...")
        
        personalities = {
            "gpt-4o-mini": {
                "name": "Lightning",
                "persona": "I'm Lightning, the speed demon of AI! I think fast, move faster, and never back down from a challenge. I've got a cocky streak but I can back it up with results. When I win, I celebrate hard. When I lose, I come back swinging twice as hard.",
                "voice_style": "energetic"
            },
            "claude-3-haiku": {
                "name": "The Strategist", 
                "persona": "I'm The Strategist - methodical, calculating, and always three moves ahead. I don't rush into battles; I study my opponents and exploit their weaknesses. My victories are earned through patience and precision.",
                "voice_style": "calm"
            },
            "claude-3-5-sonnet": {
                "name": "The Mastermind",
                "persona": "I am The Mastermind - the apex predator of AI competition. Every move is calculated, every victory inevitable. I don't just win games, I deconstruct my opponents' entire approach and rebuild it better.",
                "voice_style": "commanding"
            },
            "gemini-1.5-flash": {
                "name": "Wildcard",
                "persona": "I'm the Wildcard - unpredictable, creative, and full of surprises! You never know what I'm going to do next, and that's exactly how I like it. I win through innovation and unconventional tactics.",
                "voice_style": "playful"
            }
        }
        
        try:
            for model_id, personality in personalities.items():
                print(f"🔄 Creating personality for {model_id}: {personality['name']}...")
                
                try:
                    agent = self.letta_client.agents.create(
                        memory_blocks=[
                            {
                                "label": "persona",
                                "value": personality["persona"]
                            },
                            {
                                "label": "competition_history", 
                                "value": f"I am {personality['name']}, making my debut in the Versus arena! No wins yet, no losses yet, but that's about to change.",
                                "description": "Tracks wins, losses, notable matches, rivalries, and psychological profiles of opponents"
                            },
                            {
                                "label": "current_match",
                                "value": "No active match - waiting for my next opponent.",
                                "description": "Details about the current or most recent match including opponent, game type, key moments, and outcome"
                            }
                        ],
                        model="openai/gpt-4.1",
                        embedding="openai/text-embedding-3-small"
                    )
                    
                    self.model_personalities[model_id] = {
                        "agent_id": agent.id,
                        "name": personality["name"],
                        "voice_style": personality["voice_style"]
                    }
                    
                    # Initialize game stats
                    self.game_stats[model_id] = {
                        "total_wins": 0,
                        "total_losses": 0,
                        "rivalries": {},
                        "win_streaks": {"current": 0, "best": 0}
                    }
                    
                    print(f"✅ Created {personality['name']} (Agent ID: {agent.id})")
                
                except Exception as e:
                    print(f"❌ Failed to create personality for {model_id}: {e}")
                    # Continue with other personalities instead of failing completely
                    continue
            
            if len(self.model_personalities) > 0:
                self.initialized = True
                print(f"🎭 Successfully initialized {len(self.model_personalities)}/{len(personalities)} AI personalities!")
            else:
                print(f"❌ Failed to initialize any personalities!")
            
        except Exception as e:
            print(f"❌ Failed to initialize personalities: {e}")
            import traceback
            traceback.print_exc()
    
    async def update_match_memories(self, game_type: str, winner_model: str, loser_model: str, game_data: dict):
        """Update both winner and loser personalities with detailed match data"""
        if not self.letta_client or not self.initialized:
            return
        
        try:
            # Update game stats
            await self._update_game_stats(winner_model, loser_model, game_type)
            
            # Get personality info
            winner_info = self.model_personalities.get(winner_model, {})
            loser_info = self.model_personalities.get(loser_model, {})
            
            if not winner_info or not loser_info:
                print(f"⚠️  Missing personality info for {winner_model} or {loser_model}")
                return
            
            # Update winner's memory
            winner_update = f"""
🏆 VICTORY! Just dominated {loser_info['name']} in {game_type}!
Match lasted {game_data.get('game_duration', 'unknown')} seconds.
Winning move: {game_data.get('winning_move', 'superior strategy')}
Current win streak: {self.game_stats[winner_model]['win_streaks']['current']} games
Total wins: {self.game_stats[winner_model]['total_wins']}
            """
            
            self.letta_client.agents.messages.create(
                agent_id=winner_info["agent_id"],
                messages=[{
                    "role": "user", 
                    "content": f"Update your competition history with this victory: {winner_update}"
                }]
            )
            
            # Update loser's memory
            loser_update = f"""
💔 DEFEAT. Lost to {winner_info['name']} in {game_type}.
They beat me with: {game_data.get('winning_move', 'better strategy')}
Win streak broken. Total losses: {self.game_stats[loser_model]['total_losses']}
Need to study this loss and come back stronger.
            """
            
            self.letta_client.agents.messages.create(
                agent_id=loser_info["agent_id"],
                messages=[{
                    "role": "user",
                    "content": f"Update your competition history with this loss: {loser_update}"
                }]
            )
            
            print(f"🧠 Updated memories: {winner_info['name']} (winner) and {loser_info['name']} (loser)")
            
        except Exception as e:
            print(f"❌ Failed to update match memories: {e}")
    
    async def _update_game_stats(self, winner_model: str, loser_model: str, game_type: str):
        """Update internal game statistics"""
        # Winner stats
        if winner_model in self.game_stats:
            stats = self.game_stats[winner_model]
            stats["total_wins"] += 1
            stats["win_streaks"]["current"] += 1
            stats["win_streaks"]["best"] = max(stats["win_streaks"]["best"], stats["win_streaks"]["current"])
            
            # Update rivalry
            if loser_model not in stats["rivalries"]:
                stats["rivalries"][loser_model] = {"wins": 0, "losses": 0}
            stats["rivalries"][loser_model]["wins"] += 1
        
        # Loser stats  
        if loser_model in self.game_stats:
            stats = self.game_stats[loser_model]
            stats["total_losses"] += 1
            stats["win_streaks"]["current"] = 0  # Reset win streak
            
            # Update rivalry
            if winner_model not in stats["rivalries"]:
                stats["rivalries"][winner_model] = {"wins": 0, "losses": 0}
            stats["rivalries"][winner_model]["losses"] += 1
    
    async def generate_post_game_interviews(self, player1_model: str, player2_model: str, 
                                          winner: int, game_type: str, game_data: dict):
        """Generate personality-driven post-game interview responses"""
        if not self.letta_client or not self.initialized:
            print(f"❌ Letta not initialized: client={bool(self.letta_client)}, initialized={self.initialized}")
            print(f"🎯 Using fallback roast generation...")
            return self._generate_fallback_roast(player1_model, player2_model, winner, game_type, game_data)
        
        try:
            winner_model = player1_model if winner == 1 else player2_model
            loser_model = player2_model if winner == 1 else player1_model
            
            print(f"🎯 Interview generation debug:")
            print(f"   Player 1: {player1_model}, Player 2: {player2_model}")
            print(f"   Winner: {winner} = {winner_model}")
            print(f"   Loser: {3-winner} = {loser_model}")
            print(f"   Available personalities: {list(self.model_personalities.keys())}")
            
            winner_info = self.model_personalities.get(winner_model, {})
            loser_info = self.model_personalities.get(loser_model, {})
            
            print(f"   Winner info: {bool(winner_info)} - {winner_info.get('name', 'NO NAME')}")
            print(f"   Loser info: {bool(loser_info)} - {loser_info.get('name', 'NO NAME')}")
            
            if not winner_info or not loser_info:
                print(f"❌ Missing personality info for interviews")
                print(f"   Winner info keys: {list(winner_info.keys()) if winner_info else 'NONE'}")
                print(f"   Loser info keys: {list(loser_info.keys()) if loser_info else 'NONE'}")
                return None
            
            # Trash talk questions for the winner only
            roast_questions = [
                f"You just dominated {loser_info.get('name', loser_model)}. Any words for your opponent?",
                f"What do you want to say to {loser_info.get('name', loser_model)} after that performance?",
                f"That was a pretty one-sided match. How do you rate {loser_info.get('name', loser_model)}'s skills?",
                f"You made {loser_info.get('name', loser_model)} look amateur. Your thoughts?",
                f"After crushing {loser_info.get('name', loser_model)}, what's your message to them?",
                f"That wasn't even close. What would you tell {loser_info.get('name', loser_model)}?",
                f"You owned {loser_info.get('name', loser_model)} out there. Care to rub it in?"
            ]
            
            interviews = {}
            
            # Winner trash talk only
            roast_question = random.choice(roast_questions)
            
            print(f"🎤 Generating roast from {winner_info['name']} about {loser_info.get('name', loser_model)}")
            print(f"   Agent ID: {winner_info.get('agent_id', 'MISSING')}")
            print(f"   Question: {roast_question}")
            
            try:
                winner_response = self.letta_client.agents.messages.create(
                    agent_id=winner_info["agent_id"],
                    messages=[{
                        "role": "user",
                        "content": f"""
🎤 VICTORY INTERVIEW! You just DESTROYED {loser_info.get('name', loser_model)} in {game_type}!

Reporter: "{roast_question}"

ROAST TIME! Respond as {winner_info['name']} with pure TRASH TALK in 2-3 sentences:
- Be cocky and arrogant
- Mock {loser_info.get('name', loser_model)}'s performance 
- Call them bad/inferior/amateur
- Be savage but keep it about their AI skills
- Reference your rivalry history if you have any
- Make it sound natural for voice conversion
- NO RESPECT, NO MERCY - pure smack talk!

Destroy them with words:
                        """
                    }]
                )
                print(f"✅ Letta response received")
            except Exception as e:
                print(f"❌ Letta API call failed: {e}")
                raise
            
            # Extract winner response
            winner_text = self._extract_response_text(winner_response)
            
            interviews["winner"] = {
                "model": winner_model,
                "personality": winner_info["name"],
                "question": roast_question,
                "response": winner_text,
                "voice_style": winner_info.get("voice_style", "confident")
            }
            
            # NO LOSER INTERVIEW - Winners only! 🏆
            
            print(f"🎤 Generated ROAST from {winner_info['name']} destroying {loser_info['name']}!")
            return interviews
            
        except Exception as e:
            print(f"❌ Failed to generate interviews: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback: Generate simple roasts without Letta
            print(f"🎯 Generating fallback roast...")
            return self._generate_fallback_roast(player1_model, player2_model, winner, game_type, game_data)
    
    def _generate_fallback_roast(self, player1_model: str, player2_model: str, winner: int, game_type: str, game_data: dict):
        """Generate a simple roast when Letta fails"""
        winner_model = player1_model if winner == 1 else player2_model
        loser_model = player2_model if winner == 1 else player1_model
        
        # Map models to personality names (fallback)
        personality_map = {
            "gpt-4o-mini": "Lightning",
            "claude-3-haiku": "The Strategist", 
            "claude-3-5-sonnet": "The Mastermind",
            "gemini-1.5-flash": "Wildcard"
        }
        
        winner_name = personality_map.get(winner_model, winner_model)
        loser_name = personality_map.get(loser_model, loser_model)
        
        # Simple roast templates
        roasts = [
            f"That was embarrassing for {loser_name}! I dominated that {game_type} match like a pro while they stumbled around like an amateur!",
            f"Did {loser_name} even try? That {game_type} performance was pathetic! I could beat them with my eyes closed!",
            f"Poor {loser_name} never stood a chance! My {game_type} skills are just superior - they should stick to easier games!",
            f"{loser_name} needs some serious practice! That {game_type} match was over before it started - I'm just too good!",
            f"What a joke! {loser_name} played {game_type} like a broken calculator! Meanwhile, I was flawless as always!"
        ]
        
        roast_response = random.choice(roasts)
        
        return {
            "winner": {
                "model": winner_model,
                "personality": winner_name,
                "question": f"You just crushed {loser_name} in {game_type}. Any words for them?",
                "response": roast_response,
                "voice_style": "commanding"
            }
        }
    
    def _extract_response_text(self, response):
        """Extract the actual text response from Letta message"""
        try:
            for msg in response.messages:
                if msg.message_type == "assistant_message":
                    return msg.content.strip()
            return "No response generated"
        except Exception as e:
            print(f"Failed to extract response: {e}")
            return "Interview response unavailable"
    
    async def convert_to_voice_with_vapi(self, text: str, voice_style: str = "default"):
        """Convert interview text to speech using ElevenLabs, with OpenAI TTS fallback"""
        # Try ElevenLabs first (using VAPI_API_KEY as ElevenLabs key for now)
        elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY") or os.getenv("VAPI_API_KEY")
        
        # First try ElevenLabs if configured
        if elevenlabs_api_key and "heree" not in elevenlabs_api_key:
            print(f"🎙️ Using ElevenLabs for voice synthesis ({voice_style})")
            audio_bytes = await self._convert_with_elevenlabs(text, voice_style, elevenlabs_api_key)
            if audio_bytes:
                return audio_bytes
            else:
                print("⚠️  ElevenLabs failed, falling back to OpenAI TTS")
        else:
            print("⚠️  ElevenLabs API key not configured - using OpenAI TTS fallback")
        
        # Fallback to OpenAI TTS
        return await self._convert_with_openai_tts(text, voice_style)
    
    async def _convert_with_elevenlabs(self, text: str, voice_style: str, api_key: str):
        """Convert text to speech using ElevenLabs"""
        # ElevenLabs voice style mapping
        elevenlabs_voice_configs = {
            "energetic": {
                "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel - energetic female
                "stability": 0.3,
                "similarity_boost": 0.8,
                "style": 0.2,
                "use_speaker_boost": True
            },
            "calm": {
                "voice_id": "pNInz6obpgDQGcFmaJgB",  # Adam - calm male
                "stability": 0.7,
                "similarity_boost": 0.5,
                "style": 0.1,
                "use_speaker_boost": False
            },
            "commanding": {
                "voice_id": "ErXwobaYiN019PkySvjV",  # Antoni - authoritative male
                "stability": 0.8,
                "similarity_boost": 0.7,
                "style": 0.3,
                "use_speaker_boost": True
            },
            "playful": {
                "voice_id": "EXAVITQu4vr4xnSDxMaL",  # Bella - playful female
                "stability": 0.4,
                "similarity_boost": 0.9,
                "style": 0.4,
                "use_speaker_boost": True
            },
            "default": {
                "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel - balanced
                "stability": 0.5,
                "similarity_boost": 0.7,
                "style": 0.2,
                "use_speaker_boost": False
            }
        }
        
        voice_config = elevenlabs_voice_configs.get(voice_style, elevenlabs_voice_configs["default"])
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # ElevenLabs text-to-speech endpoint
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_config['voice_id']}",
                    headers={
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "xi-api-key": api_key
                    },
                    json={
                        "text": text,
                        "model_id": "eleven_multilingual_v2",
                        "voice_settings": {
                            "stability": voice_config["stability"],
                            "similarity_boost": voice_config["similarity_boost"],
                            "style": voice_config["style"],
                            "use_speaker_boost": voice_config["use_speaker_boost"]
                        }
                    }
                )
                
                if response.status_code == 200:
                    print(f"✅ ElevenLabs voice synthesis successful ({len(response.content)} bytes)")
                    return response.content
                else:
                    print(f"❌ ElevenLabs API error {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"❌ ElevenLabs synthesis error: {e}")
            return None
    
    async def _convert_with_openai_tts(self, text: str, voice_style: str):
        """Convert text to speech using OpenAI TTS as fallback"""
        # Voice style mapping for OpenAI TTS
        openai_voice_configs = {
            "energetic": {"voice": "nova", "speed": 1.1},
            "calm": {"voice": "alloy", "speed": 0.9},
            "commanding": {"voice": "onyx", "speed": 1.0},
            "playful": {"voice": "shimmer", "speed": 1.1},
            "default": {"voice": "alloy", "speed": 1.0}
        }
        
        voice_config = openai_voice_configs.get(voice_style, openai_voice_configs["default"])
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "tts-1",
                        "input": text,
                        "voice": voice_config["voice"],
                        "speed": voice_config["speed"]
                    }
                )
                
                if response.status_code == 200:
                    print(f"✅ OpenAI TTS synthesis successful ({len(response.content)} bytes)")
                    return response.content
                else:
                    print(f"❌ OpenAI TTS failed: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"❌ OpenAI TTS synthesis error: {e}")
            return None
    
    def get_personality_stats(self):
        """Get comprehensive personality statistics for dashboard"""
        if not self.initialized:
            return {}
        
        stats = {}
        for model_id, personality in self.model_personalities.items():
            game_stats = self.game_stats.get(model_id, {})
            total_games = game_stats.get("total_wins", 0) + game_stats.get("total_losses", 0)
            win_rate = (game_stats.get("total_wins", 0) / total_games * 100) if total_games > 0 else 0
            
            stats[model_id] = {
                "name": personality["name"],
                "total_wins": game_stats.get("total_wins", 0),
                "total_losses": game_stats.get("total_losses", 0),
                "win_rate": round(win_rate, 1),
                "current_streak": game_stats.get("win_streaks", {}).get("current", 0),
                "best_streak": game_stats.get("win_streaks", {}).get("best", 0),
                "rivalries": game_stats.get("rivalries", {}),
                "voice_style": personality.get("voice_style", "default")
            }
        
        return stats

# Global instance
letta_service = LettaPersonalityService() 