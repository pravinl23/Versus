#!/usr/bin/env python3
"""
Unified VERSUS Server - Runs all game modes from a single server
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import uvicorn
from typing import Dict, List, Optional
import uuid
import random
import sys
import os
from datetime import datetime
import re
import time

# Import Letta service
from src.services.letta_service import letta_service  # Updated with fallback

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import game implementations
from src.games.battleship.battleship import BattleshipGame
from src.games.trivia.trivia_game import TriviaGame
from src.games.trivia.questions import TRIVIA_QUESTIONS, get_random_questions
from src.games.wordle.wordle_game import WordleGame
from src.games.nyt_connections.connections_game import ConnectionsGame
from src.games.debate.debate_game import DebateGame

# Import Flask app for Wordle (we'll integrate it)
from src.games.wordle.wordle_simple import app as wordle_flask_app, WordleGame as WordleSimpleGame, get_llm_guess, parse_reasoning_for_ui

# Default model configurations
DEFAULT_MODELS = {
    "battleship": {"player1": "openai", "player2": "anthropic"},
    "trivia": {"player1": "openai", "player2": "anthropic"},
    "wordle": {"player1": "openai", "player2": "anthropic"},
    "connections": {"player1": "openai", "player2": "anthropic"}
}

def get_models_for_game(game_type: str, player1_model: Optional[str] = None, player2_model: Optional[str] = None):
    """Get models for a game, using defaults if not specified"""
    defaults = DEFAULT_MODELS.get(game_type, {"player1": "openai", "player2": "anthropic"})
    return {
        "player1": player1_model or defaults["player1"],
        "player2": player2_model or defaults["player2"]
    }

app = FastAPI(title="VERSUS Unified Game Server", version="2.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development (network IPs)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Letta personalities on startup
@app.on_event("startup")
async def startup_event():
    """Initialize Letta personalities when server starts"""
    print("🚀 Starting VERSUS server with Letta personalities...")
    
    # Create static directories if they don't exist
    os.makedirs("static/interviews", exist_ok=True)
    print("📁 Static directories initialized")
    
    try:
        print("🎭 Initializing Letta personalities...")
        await letta_service.initialize_personalities()
        
        if letta_service.initialized:
            print("✅ AI personalities ready for competition!")
        else:
            print("❌ Letta personalities failed to initialize")
            print(f"   - Client created: {bool(letta_service.letta_client)}")
            print(f"   - Initialized: {letta_service.initialized}")
            
    except Exception as e:
        print(f"❌ Error initializing Letta personalities: {e}")
        import traceback
        traceback.print_exc()

# Store active games
active_games = {}
battleship_games = {}  # Add this to store battleship games
trivia_sessions: Dict[str, Dict] = {}
wordle_games: Dict[str, WordleSimpleGame] = {}
connections_games: Dict[str, ConnectionsGame] = {}
debate_games: Dict[str, DebateGame] = {}

# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)

    def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_connections:
            self.active_connections[game_id].remove(websocket)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def broadcast_to_game(self, message: str, game_id: str):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id]:
                try:
                    await connection.send_text(message)
                except:
                    pass  # Connection might be closed

manager = ConnectionManager()

# ====================
# LETTA INTEGRATION
# ====================

async def handle_game_completion(game_type: str, winner: int, player1_model: str, player2_model: str, 
                               game_data: dict, game_id: str):
    """Enhanced game completion with Letta personality updates and interviews"""
    try:
        winner_model = player1_model if winner == 1 else player2_model
        loser_model = player2_model if winner == 1 else player1_model
        
        print(f"🎭 GAME COMPLETION DEBUG:")
        print(f"   Game Type: {game_type}")
        print(f"   Winner: Player {winner} ({winner_model})")
        print(f"   Loser: Player {3-winner} ({loser_model})")
        print(f"   Game ID: {game_id}")
        print(f"   Game Data: {game_data}")
        
        # Update Letta personalities with match results
        print(f"🧠 Updating Letta memories for future roasts...")
        await letta_service.update_match_memories(
            game_type=game_type,
            winner_model=winner_model,
            loser_model=loser_model,
            game_data=game_data
        )
        
        # Generate post-game trash talk
        print(f"🔥 Generating savage roast...")
        interviews = await letta_service.generate_post_game_interviews(
            player1_model, player2_model, winner, game_type, game_data
        )
        
        if interviews:
            print(f"✅ ROAST generated! Keys: {list(interviews.keys())}")
            # Convert to voice and broadcast
            await broadcast_post_game_interviews(interviews, game_id)
        else:
            print(f"❌ No roast generated!")
        
    except Exception as e:
        print(f"❌ Error handling game completion: {e}")
        import traceback
        traceback.print_exc()

async def broadcast_post_game_interviews(interviews: dict, game_id: str):
    """Convert trash talk to voice and broadcast to clients"""
    try:
        print(f"🔥 ROAST BROADCAST: Starting trash talk for game {game_id}")
        print(f"   Roast roles: {list(interviews.keys())}")
        
        interview_audio = {}
        
        for role, interview in interviews.items():
            print(f"🔥 Processing {role} roast: {interview['personality']}")
            print(f"   Savage response preview: {interview['response'][:100]}...")
            
            # Convert to voice
            audio_bytes = await letta_service.convert_to_voice_with_vapi(
                interview["response"], 
                interview["voice_style"]
            )
            
            if audio_bytes:
                print(f"🔊 Voice generated for {role} ({len(audio_bytes)} bytes)")
                # Create audio directory if it doesn't exist
                audio_dir = "static/interviews"
                os.makedirs(audio_dir, exist_ok=True)
                
                # Save audio file temporarily
                timestamp = int(time.time())
                audio_filename = f"interview_{game_id}_{role}_{timestamp}.mp3"
                audio_path = f"{audio_dir}/{audio_filename}"
                
                try:
                    with open(audio_path, "wb") as f:
                        f.write(audio_bytes)
                    
                    # Verify the file was written correctly
                    if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                        interview_audio[role] = {
                            "audio_url": f"/static/interviews/{audio_filename}",
                            "text": interview["response"],
                            "question": interview["question"],
                            "personality": interview["personality"],
                            "model": interview["model"],
                            "voice_style": interview["voice_style"]
                        }
                        print(f"✅ Audio saved: {audio_path} ({os.path.getsize(audio_path)} bytes)")
                        print(f"🔗 Audio URL: http://localhost:8000/static/interviews/{audio_filename}")
                    else:
                        print(f"❌ Audio file verification failed: {audio_path}")
                        raise Exception("Audio file not created properly")
                        
                except Exception as e:
                    print(f"❌ Error saving audio file: {e}")
                    # Text-only fallback
                    interview_audio[role] = {
                        "audio_url": None,
                        "text": interview["response"],
                        "question": interview["question"],
                        "personality": interview["personality"],
                        "model": interview["model"],
                        "voice_style": interview["voice_style"]
                    }
            else:
                print(f"⚠️  No audio generated for {role}, using text-only")
                # Text-only fallback
                interview_audio[role] = {
                    "audio_url": None,
                    "text": interview["response"],
                    "question": interview["question"],
                    "personality": interview["personality"],
                    "model": interview["model"],
                    "voice_style": interview["voice_style"]
                }
        
        # Broadcast to all game spectators
        broadcast_data = {
            "type": "post_game_interviews",  # Keep same type for frontend compatibility
            "interviews": interview_audio
        }
        
        print(f"📡 Broadcasting to WebSocket clients...")
        
        # Broadcast to both game channel and vote channel for compatibility
        await manager.broadcast_to_game(
            json.dumps(broadcast_data),
            game_id
        )
        
        # Also broadcast to vote channel (where Wordle connects)
        await manager.broadcast_to_game(
            json.dumps(broadcast_data),
            f"votes-{game_id}"
        )
        
        print(f"📡 Broadcast sent to both game_id and votes-{game_id} channels")
        
        print(f"✅ Successfully broadcasted SAVAGE ROAST for game {game_id}")
        
    except Exception as e:
        print(f"❌ Error broadcasting interviews: {e}")
        import traceback
        traceback.print_exc()

# ====================
# BATTLESHIP ENDPOINTS
# ====================

@app.websocket("/games/battleship/{game_id}")
async def battleship_websocket(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for Battleship games"""
    await websocket.accept()
    print(f"Client connected to battleship game {game_id}")
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "start_game":
                # Check if game already exists
                if game_id in battleship_games:
                    game = battleship_games[game_id]
                    print(f"Game {game_id} already exists, sending current state")
                    
                    # Send current game state
                    await websocket.send_json({
                        "type": "game_state",
                        "status": game.status,
                        "message": "Game already in progress",
                        "currentPlayer": game.current_player,
                        "player1Shots": game.game_state["player1_shots"],
                        "player2Shots": game.game_state["player2_shots"],
                        "player1Board": game.game_state["player1_board"],
                        "player2Board": game.game_state["player2_board"],
                        "shipsPlaced": game.ships_placed,
                        "winner": game.winner
                    })
                    
                    # If game is active, continue the game loop
                    if game.status == "active" and not game.winner:
                        asyncio.create_task(continue_battleship_game(game, websocket, game_id))
                    continue
                
                # Create new game
                player1_model = data.get("player1Model", "gpt-4o-mini")
                player2_model = data.get("player2Model", "claude-3-haiku")
                
                print(f"Creating new battleship game {game_id} with models: {player1_model} vs {player2_model}")
                
                # Create and store the battleship game
                game = BattleshipGame(player1_model, player2_model)
                battleship_games[game_id] = game
                
                # Send initial game state
                await websocket.send_json({
                    "type": "game_state",
                    "status": "placement",
                    "message": "Placing ships...",
                    "currentPlayer": 1,
                    "player1Shots": game.game_state["player1_shots"],
                    "player2Shots": game.game_state["player2_shots"],
                    "shipsPlaced": game.ships_placed
                })
                
                # Place ships for both players
                for player in [1, 2]:
                    await websocket.send_json({
                        "type": "placement_start",
                        "player": player,
                        "message": f"Player {player} is placing ships..."
                    })
                    
                    # Place all ships for this player
                    game.place_ships_for_player(player)
                    
                    # Send the complete board after all ships are placed
                    await websocket.send_json({
                        "type": "ship_placed",
                        "player": player,
                        "board": game.game_state[f'player{player}_board']
                    })
                    
                    await asyncio.sleep(0.2)
                
                # Send placement complete
                await websocket.send_json({
                    "type": "placement_complete",
                    "message": "All ships placed! Game starting...",
                    "player1Board": game.game_state['player1_board'],
                    "player2Board": game.game_state['player2_board']
                })
                
                await asyncio.sleep(0.5)
                
                # Start game loop
                game.status = "active"
                asyncio.create_task(run_battleship_game_loop(game, websocket, game_id))
            
            elif data.get("type") == "get_state":
                # Handle request for current game state
                if game_id in battleship_games:
                    game = battleship_games[game_id]
                    await websocket.send_json({
                        "type": "game_state",
                        "status": game.status,
                        "currentPlayer": game.current_player,
                        "player1Shots": game.game_state["player1_shots"],
                        "player2Shots": game.game_state["player2_shots"],
                        "player1Board": game.game_state["player1_board"],
                        "player2Board": game.game_state["player2_board"],
                        "winner": game.winner,
                        "message": "Current game state"
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Game not found"
                    })
            
    except WebSocketDisconnect:
        print(f"Client disconnected from battleship game {game_id}")
    except Exception as e:
        print(f"WebSocket error in game {game_id}: {e}")
        import traceback
        traceback.print_exc()

async def continue_battleship_game(game: BattleshipGame, websocket: WebSocket, game_id: str):
    """Continue an existing battleship game"""
    try:
        # Send current state first
        await websocket.send_json({
            "type": "game_state",
            "status": game.status,
            "currentPlayer": game.current_player,
            "player1Shots": game.game_state["player1_shots"],
            "player2Shots": game.game_state["player2_shots"],
            "winner": game.winner,
            "message": "Continuing game..."
        })
        
        # Continue the game loop
        await run_battleship_game_loop(game, websocket, game_id)
    except Exception as e:
        print(f"Error continuing game {game_id}: {e}")

async def run_battleship_game_loop(game: BattleshipGame, websocket: WebSocket, game_id: str):
    """Run the battleship game loop in a separate task"""
    try:
        while game.status == "active" and not game.winner:
            current_player = game.current_player
            max_retries = 5
            retry_count = 0
            
            while retry_count < max_retries:
                # Generate a fresh prompt for each retry
                prompt = game.get_prompt_for_player(current_player)
                
                if current_player == 1:
                    move_response = game.player1.get_move(prompt, game.game_state)
                else:
                    move_response = game.player2.get_move(prompt, game.game_state)
                
                try:
                    # Clean up the response
                    move_str = move_response.strip().upper()
                    
                    # Remove any extra text, just get the first word
                    move_str = move_str.split()[0] if move_str else ""
                    
                    # Try to parse the move
                    # Look for pattern like A5, H8, etc.
                    coord_match = re.search(r'[A-H][1-8]', move_str)
                    
                    if coord_match:
                        coord = coord_match.group(0)
                        col_letter = coord[0]
                        row_num = int(coord[1])
                        col_idx = ord(col_letter) - ord('A')
                        row_idx = row_num - 1
                    else:
                        raise ValueError(f"Could not parse move: {move_response}")
                    
                    # Validate bounds
                    if not (0 <= row_idx < game.board_size and 0 <= col_idx < game.board_size):
                        raise ValueError(f"Move out of bounds: row={row_idx}, col={col_idx}")
                    
                    move_result = game.make_move(row_idx, col_idx)
                    
                    if move_result["success"]:
                        col_letter = chr(col_idx + ord('A'))
                        await websocket.send_json({
                            "type": "game_state",
                            "currentPlayer": game.current_player,
                            "player1Shots": game.game_state["player1_shots"],
                            "player2Shots": game.game_state["player2_shots"],
                            "lastMove": f"{col_letter}{row_idx + 1}",
                            "lastResult": move_result["result"],
                            "message": f"Player {3 - game.current_player} fired at {col_letter}{row_idx + 1} - {move_result['result'].upper()}!",
                            "status": "finished" if game.winner else "in_progress",
                            "winner": game.winner
                        })
                        
                        if game.winner:
                            game.status = "finished"
                            await websocket.send_json({
                                "type": "game_over",
                                "winner": game.winner,
                                "message": f"🎉 Player {game.winner} wins!"
                            })
                            
                            # LETTA INTEGRATION: Handle game completion
                            game_data = {
                                "game_duration": int(time.time() - getattr(game, 'start_time', time.time())),
                                "winning_move": f"{col_letter}{row_idx + 1}",
                                "total_moves": game.game_state.get('turn_count', 0),
                                "match_quality": "intense" if game.game_state.get('turn_count', 0) > 20 else "quick"
                            }
                            
                            asyncio.create_task(handle_game_completion(
                                "Battleship", game.winner, game.player1_model, game.player2_model, 
                                game_data, game_id
                            ))
                            
                            # Remove the game after it's finished
                            if game_id in battleship_games:
                                del battleship_games[game_id]
                            break
                        
                        await asyncio.sleep(0.3)
                        break
                    else:
                        print(f"Invalid move from player {current_player}: {move_result.get('reason', move_result.get('result', 'unknown error'))}")
                        retry_count += 1
                        await asyncio.sleep(0.5)
                        
                except Exception as e:
                    print(f"Error processing move from player {current_player}: {e}")
                    print(f"Raw response was: {move_response}")
                    retry_count += 1
                    await asyncio.sleep(0.5)
                    continue
            
            # If we exhausted all retries, try a random valid move
            if retry_count >= max_retries:
                print(f"Player {current_player} failed to make a valid move after {max_retries} attempts")
                # Find a random available position
                available_positions = []
                shots = game.game_state[f'player{current_player}_shots']
                for i in range(game.board_size):
                    for j in range(game.board_size):
                        if shots[i][j] is None:
                            available_positions.append((i, j))
                
                if available_positions:
                    row_idx, col_idx = random.choice(available_positions)
                    move_result = game.make_move(row_idx, col_idx)
                    
                    if move_result["success"]:
                        col_letter = chr(col_idx + ord('A'))
                        await websocket.send_json({
                            "type": "game_state",
                            "currentPlayer": game.current_player,
                            "player1Shots": game.game_state["player1_shots"],
                            "player2Shots": game.game_state["player2_shots"],
                            "lastMove": f"{col_letter}{row_idx + 1}",
                            "lastResult": move_result["result"],
                            "message": f"Player {3 - game.current_player} fired at {col_letter}{row_idx + 1} - {move_result['result'].upper()}! (random fallback)",
                            "status": "finished" if game.winner else "in_progress",
                            "winner": game.winner
                        })
                        
                        if game.winner:
                            game.status = "finished"
                            await websocket.send_json({
                                "type": "game_over",
                                "winner": game.winner,
                                "message": f"🎉 Player {game.winner} wins!"
                            })
                            
                            # LETTA INTEGRATION: Handle game completion (random move case)
                            game_data = {
                                "game_duration": int(time.time() - getattr(game, 'start_time', time.time())),
                                "winning_move": f"{col_letter}{row_idx + 1} (random)",
                                "total_moves": game.game_state.get('turn_count', 0),
                                "match_quality": "chaotic"
                            }
                            
                            asyncio.create_task(handle_game_completion(
                                "Battleship", game.winner, game.player1_model, game.player2_model, 
                                game_data, game_id
                            ))
                            
                            # Remove the game after it's finished
                            if game_id in battleship_games:
                                del battleship_games[game_id]
                else:
                    print(f"No available positions for player {current_player}")
                    break
                    
    except Exception as e:
        print(f"Error in game loop for {game_id}: {e}")
        import traceback
        traceback.print_exc()

# =================
# TRIVIA ENDPOINTS
# =================

class GameStartRequest(BaseModel):
    player1_model: Optional[str] = None
    player2_model: Optional[str] = None
    question_count: Optional[int] = 20

@app.post("/api/trivia/start")
async def start_trivia_game(request: GameStartRequest):
    """Start a new trivia game session"""
    try:
        game_id = str(uuid.uuid4())
        questions = get_random_questions(request.question_count)
        
        # Use model IDs directly
        player1_model = request.player1_model or "gpt-4o-mini"
        player2_model = request.player2_model or "claude-3-haiku"
        
        print(f"Starting trivia game with models: {player1_model} vs {player2_model}")
        
        trivia_game = TriviaGame(
            player1_model=player1_model,
            player2_model=player2_model,
            questions=questions
        )
        
        trivia_sessions[game_id] = {
            "game": trivia_game,
            "is_active": True
        }
        
        return {
            "game_id": game_id,
            "status": "started",
            "total_questions": len(questions),
            "player1_model": player1_model,
            "player2_model": player2_model
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start game: {str(e)}")

@app.websocket("/api/trivia/ws/{game_id}")
async def trivia_websocket(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for trivia real-time updates"""
    await manager.connect(websocket, game_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)

@app.post("/api/trivia/game/{game_id}/player/{player}/next-question")
async def player_next_question(game_id: str, player: int):
    """Process next question for a specific player"""
    if game_id not in trivia_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = trivia_sessions[game_id]
    game = session["game"]
    
    if game.game_over:
        return {"error": "Race is already over"}
    
    if player not in [1, 2]:
        raise HTTPException(status_code=400, detail="Player must be 1 or 2")
    
    try:
        result = await game.ask_question_to_player(player)
        
        await manager.broadcast_to_game(
            json.dumps({
                "type": "player_question_result",
                "data": result
            }),
            game_id
        )
        
        if game.race_finished:
            final_results = game.get_final_results()
            await manager.broadcast_to_game(
                json.dumps({
                    "type": "race_finished",
                    "data": final_results
                }),
                game_id
            )
            session["is_active"] = False
            
            # LETTA INTEGRATION: Handle trivia game completion
            game_data = {
                "game_duration": final_results.get("race_time", 0),
                "winning_move": "completed all questions first",
                "final_scores": final_results.get("final_scores", {}),
                "questions_completed": final_results.get("questions_completed", {}),
                "match_quality": "intellectual battle"
            }
            
            asyncio.create_task(handle_game_completion(
                "Trivia", game.race_winner, 
                game.player1.model_id if hasattr(game.player1, 'model_id') else "gpt-4o-mini", 
                game.player2.model_id if hasattr(game.player2, 'model_id') else "claude-3-haiku", 
                game_data, game_id
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trivia/game/{game_id}/player/{player}/current-question")
async def get_player_current_question(game_id: str, player: int):
    """Get the current question for a specific player"""
    if game_id not in trivia_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = trivia_sessions[game_id]["game"]
    
    if player not in [1, 2]:
        raise HTTPException(status_code=400, detail="Player must be 1 or 2")
    
    current_question = game.get_player_current_question(player)
    question_index = game.player1_question_index if player == 1 else game.player2_question_index
    
    return {
        "player": player,
        "question_index": question_index,
        "current_question": current_question,
        "total_questions": len(game.questions),
        "finished": question_index >= len(game.questions)
    }

# =================
# WORDLE ENDPOINTS
# =================

# Global single wordle game for backward compatibility
current_wordle_game = None

@app.post("/api/wordle/start")
async def start_wordle_game(request: dict):
    """Start a new Wordle game"""
    global current_wordle_game
    
    secret_word = request.get('secret_word', '').upper()
    
    if len(secret_word) != 5 or not secret_word.isalpha():
        raise HTTPException(status_code=400, detail="Must be a 5-letter word")
    
    # Create game and store as current game
    current_wordle_game = WordleSimpleGame(secret_word)
    
    # Also store with game_id for future use
    game_id = str(uuid.uuid4())
    wordle_games[game_id] = current_wordle_game
    
    return {"success": True, "game_id": game_id}

@app.get("/api/wordle/state/{game_id}")
async def get_wordle_state(game_id: str):
    """Get current Wordle game state"""
    if game_id not in wordle_games:
        raise HTTPException(status_code=404, detail="No active game")
    
    game = wordle_games[game_id]
    return {
        "models": game.models,
        "game_over": game.game_over,
        "winner": game.winner,
        "secret_word": game.secret_word if game.game_over else None
    }

@app.get("/api/wordle/state")
async def get_wordle_state_no_id():
    """Get current Wordle game state (backward compatibility)"""
    if not current_wordle_game:
        raise HTTPException(status_code=404, detail="No active game")
    
    return {
        "models": current_wordle_game.models,
        "game_over": current_wordle_game.game_over,
        "winner": current_wordle_game.winner,
        "secret_word": current_wordle_game.secret_word if current_wordle_game.game_over else None
    }

@app.post("/api/wordle/guess/{game_id}")
async def make_wordle_guess(game_id: str, request: dict):
    """Make a guess for a Wordle model"""
    if game_id not in wordle_games:
        raise HTTPException(status_code=404, detail="No active game")
    
    model = request.get('model')
    
    if model not in ['openai', 'anthropic']:
        raise HTTPException(status_code=400, detail="Invalid model")
    
    game = wordle_games[game_id]
    model_data = game.models[model]
    
    try:
        guess, reasoning = get_llm_guess(model, model_data['guesses'], model_data['feedback'])
    except Exception as e:
        print(f"❌ Error getting guess from {model}: {e}")
        fallback_words = ["CRANE", "SLATE", "AUDIO", "HOUSE", "ROUND"]
        guess = fallback_words[len(model_data['guesses']) % len(fallback_words)]
        reasoning = f"API error - using fallback word: {guess}"
    
    result = game.make_guess(model, guess, reasoning)
    
    # Check if the game is already over
    if "error" in result:
        # Game is already over, return appropriate response
        return {
            "error": result["error"],
            "game_over": True,
            "winner": game.winner
        }
    
    detailed_reasoning = parse_reasoning_for_ui(model, reasoning, model_data['guesses'], model_data['feedback'])
    
    # LETTA INTEGRATION: Handle Wordle game completion
    if result['game_over'] and result['winner']:
        # Determine player models for Letta integration
        player1_model = "gpt-4o-mini"  # Default for openai
        player2_model = "claude-3-haiku"  # Default for anthropic
        
        # Determine winner (1 = openai, 2 = anthropic)
        winner_num = 1 if result['winner'] == 'openai' else 2
        
        # Get game data for interview context
        game_data = {
            "secret_word": game.secret_word,
            "winning_guess": guess if result['winner'] == model else "completed first",
            "game_duration": len(model_data['guesses']) * 30,  # Rough estimate
            "guesses_made": {
                "openai": len(game.models['openai']['guesses']),
                "anthropic": len(game.models['anthropic']['guesses'])
            },
            "match_quality": "word puzzle battle"
        }
        
        print(f"🎮 Wordle game completed! {result['winner']} wins!")
        asyncio.create_task(handle_game_completion(
            "Wordle", winner_num, player1_model, player2_model, 
            game_data, game_id
        ))
    
    return {
        "guess": guess,
        "reasoning": reasoning,
        "detailed_reasoning": detailed_reasoning,
        "feedback": result['feedback'],
        "game_over": result['game_over'],
        "winner": result['winner']
    }

@app.post("/api/wordle/guess")
async def make_wordle_guess_no_id(request: dict):
    """Make a guess for a Wordle model (backward compatibility)"""
    if not current_wordle_game:
        raise HTTPException(status_code=404, detail="No active game")
    
    model = request.get('model')
    
    if model not in ['openai', 'anthropic']:
        raise HTTPException(status_code=400, detail="Invalid model")
    
    model_data = current_wordle_game.models[model]
    
    try:
        guess, reasoning = get_llm_guess(model, model_data['guesses'], model_data['feedback'])
    except Exception as e:
        print(f"❌ Error getting guess from {model}: {e}")
        fallback_words = ["CRANE", "SLATE", "AUDIO", "HOUSE", "ROUND"]
        guess = fallback_words[len(model_data['guesses']) % len(fallback_words)]
        reasoning = f"API error - using fallback word: {guess}"
    
    result = current_wordle_game.make_guess(model, guess, reasoning)
    
    # Check if the game is already over
    if "error" in result:
        # Game is already over, return appropriate response
        return {
            "error": result["error"],
            "game_over": True,
            "winner": current_wordle_game.winner
        }
    
    detailed_reasoning = parse_reasoning_for_ui(model, reasoning, model_data['guesses'], model_data['feedback'])
    
    # LETTA INTEGRATION: Handle Wordle game completion (backward compatibility)
    if result['game_over'] and result['winner']:
        # Determine player models for Letta integration
        player1_model = "gpt-4o-mini"  # Default for openai
        player2_model = "claude-3-haiku"  # Default for anthropic
        
        # Determine winner (1 = openai, 2 = anthropic)
        winner_num = 1 if result['winner'] == 'openai' else 2
        
        # Get game data for interview context
        game_data = {
            "secret_word": current_wordle_game.secret_word,
            "winning_guess": guess if result['winner'] == model else "completed first",
            "game_duration": len(model_data['guesses']) * 30,  # Rough estimate
            "guesses_made": {
                "openai": len(current_wordle_game.models['openai']['guesses']),
                "anthropic": len(current_wordle_game.models['anthropic']['guesses'])
            },
            "match_quality": "word puzzle battle"
        }
        
        # Use a default game_id for backward compatibility
        fallback_game_id = "wordle-legacy"
        
        print(f"🎮 Wordle game completed! {result['winner']} wins!")
        asyncio.create_task(handle_game_completion(
            "Wordle", winner_num, player1_model, player2_model, 
            game_data, fallback_game_id
        ))
    
    return {
        "guess": guess,
        "reasoning": reasoning,
        "detailed_reasoning": detailed_reasoning,
        "feedback": result['feedback'],
        "game_over": result['game_over'],
        "winner": result['winner']
    }

# =======================
# NYT CONNECTIONS ENDPOINTS
# =======================

class ConnectionsStartRequest(BaseModel):
    player1_model: Optional[str] = None
    player2_model: Optional[str] = None

@app.post("/api/connections/start")
async def start_connections_game(request: ConnectionsStartRequest):
    """Start a new NYT Connections game"""
    try:
        game_id = str(uuid.uuid4())
        
        # Use model IDs directly
        player1_model = request.player1_model or "gpt-4o-mini"
        player2_model = request.player2_model or "claude-3-haiku"
        
        # Create two separate games with the same puzzle
        game1 = ConnectionsGame()
        game2 = ConnectionsGame(puzzle_data=game1.puzzle)  # Use same puzzle
        
        # Store games with model info
        connections_games[game_id] = {
            "player1_game": game1,
            "player2_game": game2,
            "player1_model": player1_model,
            "player2_model": player2_model
        }
        
        return {
            "game_id": game_id,
            "status": "started",
            "puzzle_id": game1.id,
            "date": game1.date,
            "words": game1.all_words,
            "player1_model": player1_model,
            "player2_model": player2_model
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start game: {str(e)}")

@app.websocket("/api/connections/ws/{game_id}")
async def connections_websocket(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for NYT Connections real-time updates"""
    await manager.connect(websocket, game_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)

@app.post("/api/connections/game/{game_id}/player/{player}/ai-turn")
async def connections_ai_turn(game_id: str, player: str, request: dict):
    """Process an AI turn for NYT Connections"""
    # Convert player to int
    try:
        player_num = int(player)
        if player_num not in [1, 2]:
            raise ValueError("Player must be 1 or 2")
    except ValueError:
        raise HTTPException(status_code=400, detail="Player must be 1 or 2")
    
    if game_id not in connections_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = connections_games[game_id]
    
    # Get the appropriate game and model for this player
    if player_num == 1:
        game = session["player1_game"]
        model_id = session["player1_model"]
    else:
        game = session["player2_game"]
        model_id = session["player2_model"]
    
    if game.game_over:
        return {"error": "Game is already over"}
    
    try:
        # Get AI guess using the model ID
        guess = game.get_ai_guess(model_id)
        
        if not guess:
            return {"error": "Failed to get AI guess"}
        
        # Make the guess
        result = game.make_guess(model_id, guess)
        
        # Broadcast update
        await manager.broadcast_to_game(
            json.dumps({
                "type": "game_update",
                "data": {
                    "player": player_num,
                    "model": model_id,
                    "guess": guess,
                    "result": result,
                    "game_state": game.get_game_state()
                }
            }),
            game_id
        )
        
        # LETTA INTEGRATION: Handle Connections game completion
        if game.game_over:
            # Determine winner based on score
            player1_game = session["player1_game"]
            player2_game = session["player2_game"]
            
            player1_score = player1_game.score if hasattr(player1_game, 'score') else 0
            player2_score = player2_game.score if hasattr(player2_game, 'score') else 0
            
            if player1_score > player2_score:
                winner_num = 1
            elif player2_score > player1_score:
                winner_num = 2
            else:
                winner_num = player_num  # Current player wins in case of tie
            
            # Get game data for interview context
            game_data = {
                "final_scores": {
                    "player1": player1_score,
                    "player2": player2_score
                },
                "winning_move": guess,
                "game_duration": 300,  # Rough estimate for connections
                "categories_found": {
                    "player1": len(getattr(player1_game, 'found_categories', [])),
                    "player2": len(getattr(player2_game, 'found_categories', []))
                },
                "match_quality": "pattern recognition challenge"
            }
            
            print(f"🎮 Connections game completed! Player {winner_num} wins!")
            asyncio.create_task(handle_game_completion(
                "Connections", winner_num, session["player1_model"], session["player2_model"], 
                game_data, game_id
            ))
        
        return {
            "player": player_num,
            "model": model_id,
            "guess": guess,
            "result": result,
            "game_state": game.get_game_state()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/connections/game/{game_id}/state")
async def get_connections_state(game_id: str):
    """Get current NYT Connections game state"""
    if game_id not in connections_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = connections_games[game_id]
    return {
        "player1_state": session["player1_game"].get_game_state(),
        "player2_state": session["player2_game"].get_game_state(),
        "player1_model": session["player1_model"],
        "player2_model": session["player2_model"]
    }

# =================
# DEBATE ENDPOINTS
# =================

@app.websocket("/games/debate/{game_id}")
async def debate_websocket(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for Debate games"""
    await websocket.accept()
    print(f"Client connected to debate game {game_id}")
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "start_debate":
                # Check if game already exists
                if game_id in debate_games:
                    game = debate_games[game_id]
                    print(f"Debate {game_id} already exists, sending current state")
                    
                    # Send current game state
                    await websocket.send_json({
                        "type": "game_state",
                        "state": game.get_state()
                    })
                    continue
                
                # Create new debate
                topic = data.get("topic", "")
                player1_model = data.get("player1Model", "gpt-4o-mini")
                player2_model = data.get("player2Model", "claude-3-haiku")
                judge_model = data.get("judgeModel", "gpt-4o")
                
                if not topic:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Topic is required"
                    })
                    continue
                
                print(f"Creating new debate {game_id} - Topic: {topic}")
                print(f"Models: {player1_model} (PRO) vs {player2_model} (CON), Judge: {judge_model}")
                
                # Create debate game
                game = DebateGame(game_id, player1_model, player2_model)
                debate_games[game_id] = game
                
                # Set WebSocket for broadcasting
                game.websocket = websocket
                
                # Initialize debate with topic
                await game.initialize(topic, judge_model)
                
            elif data.get("type") == "get_state":
                # Handle request for current game state
                if game_id in debate_games:
                    game = debate_games[game_id]
                    await websocket.send_json({
                        "type": "game_state",
                        "state": game.get_state()
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Debate not found"
                    })
            
    except WebSocketDisconnect:
        print(f"Client disconnected from debate game {game_id}")
        # Clean up game if needed
        if game_id in debate_games:
            game = debate_games[game_id]
            if hasattr(game, 'websocket'):
                game.websocket = None
    except Exception as e:
        print(f"WebSocket error in debate {game_id}: {e}")
        import traceback
        traceback.print_exc()

# ===================
# VOTING ENDPOINTS
# ===================

# Store votes per game session
vote_storage: Dict[str, Dict[str, int]] = {}

class Vote(BaseModel):
    gameId: str
    model: str  # "gpt-4o" or "claude"

@app.post("/api/vote")
async def submit_vote(vote: Vote):
    """Submit a vote for a model in a specific game"""
    # Validate model
    if vote.model.lower() not in ["gpt-4o", "claude"]:
        raise HTTPException(status_code=400, detail="Invalid model. Must be 'gpt-4o' or 'claude'")
    
    # Initialize vote storage for game if it doesn't exist
    if vote.gameId not in vote_storage:
        vote_storage[vote.gameId] = {"gpt-4o": 0, "claude": 0}
    
    # Increment vote count
    model_key = vote.model.lower()
    vote_storage[vote.gameId][model_key] += 1
    
    # Calculate updated stats
    votes = vote_storage[vote.gameId]
    total = votes["gpt-4o"] + votes["claude"]
    
    # Broadcast vote update via WebSocket with complete data
    await manager.broadcast_to_game(
        json.dumps({
            "type": "vote_update",
            "data": {
                "gameId": vote.gameId,
                "votes": votes,
                "total": total,
                "percentages": {
                    "gpt_4o": round((votes["gpt-4o"] / total * 100) if total > 0 else 0, 1),
                    "claude": round((votes["claude"] / total * 100) if total > 0 else 0, 1)
                }
            }
        }),
        f"votes-{vote.gameId}"
    )
    
    return {"message": "Vote recorded", "gameId": vote.gameId}

@app.get("/api/vote/stats")
async def get_vote_stats(gameId: str):
    """Get voting statistics for a specific game"""
    if gameId not in vote_storage:
        # Initialize with 0 votes if game doesn't exist yet
        vote_storage[gameId] = {"gpt-4o": 0, "claude": 0}
    
    votes = vote_storage[gameId]
    total = votes["gpt-4o"] + votes["claude"]
    
    return {
        "gameId": gameId,
        "gpt_4o": votes["gpt-4o"],
        "claude": votes["claude"],
        "total": total,
        "percentages": {
            "gpt_4o": round((votes["gpt-4o"] / total * 100) if total > 0 else 0, 1),
            "claude": round((votes["claude"] / total * 100) if total > 0 else 0, 1)
        }
    }

@app.websocket("/api/vote/ws/{game_id}")
async def vote_websocket(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for real-time vote updates"""
    await manager.connect(websocket, f"votes-{game_id}")
    try:
        # Send current vote stats on connection
        if game_id in vote_storage:
            votes = vote_storage[game_id]
            total = votes["gpt-4o"] + votes["claude"]
            await websocket.send_text(json.dumps({
                "type": "vote_update",
                "data": {
                    "gameId": game_id,
                    "votes": votes,
                    "total": total,
                    "percentages": {
                        "gpt_4o": round((votes["gpt-4o"] / total * 100) if total > 0 else 0, 1),
                        "claude": round((votes["claude"] / total * 100) if total > 0 else 0, 1)
                    }
                }
            }))
        
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, f"votes-{game_id}")

# ====================
# COMMON ENDPOINTS
# ====================

@app.get("/")
async def root():
    """Root endpoint with server info"""
    return {
        "server": "VERSUS Unified Game Server",
        "version": "2.0.0",
        "games": {
            "battleship": {"active": len([g for g in active_games.items() if g[1].get("type") == "battleship"])},
            "trivia": {"active": len(trivia_sessions)},
            "wordle": {"active": len(wordle_games)},
            "connections": {"active": len(connections_games)},
            "debate": {"active": len(debate_games)}
        },
        "endpoints": {
            "battleship": "/games/battleship/{game_id}",
            "trivia": "/api/trivia/*",
            "wordle": "/api/wordle/*",
            "connections": "/api/connections/*",
            "debate": "/games/debate/{game_id}"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "games": {
            "battleship": "ready",
            "trivia": "ready",
            "wordle": "ready",
            "connections": "ready",
            "debate": "ready"
        },
        "letta_personalities": letta_service.initialized
    }

@app.get("/api/personalities")
async def get_personality_stats():
    """Get AI personality statistics and rivalry data"""
    return {
        "personalities": letta_service.get_personality_stats(),
        "initialized": letta_service.initialized
    }

@app.post("/api/test-roast")
async def test_roast():
    """Manually trigger a test roast for debugging"""
    if not letta_service:
        return {"error": "Letta service not available"}
    
    try:
        print("🧪 TEST: Manually generating roast...")
        
        # Test roast generation
        interviews = await letta_service.generate_post_game_interviews(
            player1_model="gpt-4o-mini",
            player2_model="claude-3-haiku", 
            winner=2,  # Claude-3-haiku wins
            game_type="Wordle",
            game_data={
                "secret_word": "TEST",
                "winning_guess": "TEST",  
                "game_duration": 15,
                "guesses_made": {"openai": 5, "anthropic": 3},
                "match_quality": "manual test"
            }
        )
        
        if interviews:
            print(f"✅ TEST: Generated interviews: {interviews}")
            
            # Convert to voice if we have a winner
            if interviews.get('winner'):
                winner_data = interviews['winner']
                print(f"🎙️ TEST: Converting to voice...")
                
                audio_bytes = await letta_service.convert_to_voice_with_vapi(
                    winner_data['response'], 
                    winner_data.get('voice_style', 'default')
                )
                
                if audio_bytes:
                    # Save test audio file
                    import uuid
                    test_filename = f"test_roast_{int(time.time())}.mp3"
                    audio_path = os.path.join("static", "interviews", test_filename)
                    
                    os.makedirs(os.path.dirname(audio_path), exist_ok=True)
                    with open(audio_path, "wb") as f:
                        f.write(audio_bytes)
                    
                    interviews['winner']['audio_url'] = f"/static/interviews/{test_filename}"
                    print(f"🎵 TEST: Audio saved to {audio_path}")
                else:
                    print("❌ TEST: Audio generation failed")
            
            return {"success": True, "interviews": interviews}
        else:
            print(f"❌ TEST: No interviews generated - this should not happen with fallback!")
            return {"error": "Failed to generate interviews", "interviews": interviews}
            
    except Exception as e:
        print(f"❌ TEST: Error generating roast: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

# Serve static audio files
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/api/default-models")
async def get_default_models():
    """Get default model configurations for all games"""
    return {
        "default_models": DEFAULT_MODELS,
        "supported_models": ["openai", "anthropic", "gemini", "groq"]
    }

@app.get("/api/test/audio-files")
async def test_audio_files():
    """Test endpoint to check audio files in static directory"""
    import os
    audio_dir = "static/interviews"
    
    if not os.path.exists(audio_dir):
        return {"error": "Audio directory doesn't exist", "path": audio_dir}
    
    files = []
    for filename in os.listdir(audio_dir):
        if filename.endswith(('.mp3', '.wav', '.ogg')):
            file_path = os.path.join(audio_dir, filename)
            file_size = os.path.getsize(file_path)
            files.append({
                "filename": filename,
                "size_bytes": file_size,
                "url": f"http://localhost:8000/static/interviews/{filename}",
                "created": os.path.getctime(file_path)
            })
    
    return {
        "audio_directory": audio_dir,
        "total_files": len(files),
        "files": sorted(files, key=lambda x: x["created"], reverse=True)[:10]  # Last 10 files
    }

@app.post("/api/test/send-roast/{game_id}")
async def test_send_roast(game_id: str):
    """Test endpoint to manually send a fake roast message"""
    # Get the latest audio file if any
    audio_dir = "static/interviews"
    latest_audio = None
    
    if os.path.exists(audio_dir):
        audio_files = [f for f in os.listdir(audio_dir) if f.endswith(('.mp3', '.wav', '.ogg'))]
        if audio_files:
            latest_file = max(audio_files, key=lambda f: os.path.getctime(os.path.join(audio_dir, f)))
            latest_audio = f"http://localhost:8000/static/interviews/{latest_file}"
    
    # Create test roast data
    test_roast = {
        "type": "post_game_interviews",
        "interviews": {
            "winner": {
                "model": "test-model",
                "personality": "Test Roaster",
                "question": "How do you feel about crushing your opponent?",
                "response": "That was easy! My opponent couldn't code their way out of a paper bag!",
                "voice_style": "commanding",
                "audio_url": latest_audio
            }
        }
    }
    
    print(f"🧪 Sending test roast to game {game_id}")
    print(f"🎵 Test audio URL: {latest_audio}")
    
    # Broadcast to both channels
    await manager.broadcast_to_game(
        json.dumps(test_roast),
        game_id
    )
    
    await manager.broadcast_to_game(
        json.dumps(test_roast),
        f"votes-{game_id}"
    )
    
    return {
        "message": "Test roast sent",
        "game_id": game_id,
        "audio_url": latest_audio,
        "channels": [game_id, f"votes-{game_id}"]
    }

if __name__ == "__main__":
    print("🎮 Starting VERSUS Unified Game Server...")
    print("📝 Server running on http://localhost:8000")
    print("🔧 API docs available at http://localhost:8000/docs")
    print("❌ Press Ctrl+C to stop the server")
    print("-" * 50)
    print("Available games:")
    print("  - Battleship: WebSocket at /games/battleship/{game_id}")
    print("  - Trivia: API at /api/trivia/*")
    print("  - Wordle: API at /api/wordle/*")
    print("  - NYT Connections: API at /api/connections/*")
    print("  - Debate: WebSocket at /games/debate/{game_id}")
    print("-" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 