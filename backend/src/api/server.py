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

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import game implementations
from src.games.battleship.battleship import BattleshipGame
from src.games.trivia.trivia_game import TriviaGame
from src.games.trivia.questions import TRIVIA_QUESTIONS, get_random_questions
from src.games.wordle.wordle_game import WordleGame

# Import Flask app for Wordle (we'll integrate it)
from src.games.wordle.wordle_simple import app as wordle_flask_app, WordleGame as WordleSimpleGame, get_llm_guess, parse_reasoning_for_ui

# Default model configurations
DEFAULT_MODELS = {
    "battleship": {"player1": "openai", "player2": "anthropic"},
    "trivia": {"player1": "openai", "player2": "anthropic"},
    "wordle": {"player1": "openai", "player2": "anthropic"}
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
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:5002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active games and sessions
active_games: Dict[str, Dict] = {}
trivia_sessions: Dict[str, Dict] = {}
wordle_games: Dict[str, WordleSimpleGame] = {}

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
                # Use default models if not provided
                models = get_models_for_game("battleship", 
                                           data.get("player1Model"), 
                                           data.get("player2Model"))
                player1_model = models["player1"]
                player2_model = models["player2"]
                
                print(f"Starting battleship game with models: {player1_model} vs {player2_model}")
                
                # Create and run the battleship game
                game = BattleshipGame(player1_model, player2_model)
                
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
                    
                    for ship_name, ship_size in game.ships.items():
                        placed = False
                        attempts = 0
                        
                        while not placed and attempts < 100:
                            row = random.randint(0, game.board_size - 1)
                            col = random.randint(0, game.board_size - 1)
                            orientation = random.choice(['horizontal', 'vertical'])
                            
                            if game._can_place_ship(game.game_state[f'player{player}_board'], row, col, ship_size, orientation):
                                game.place_ship(player, {
                                    'id': ship_name,
                                    'size': ship_size,
                                    'row': row,
                                    'col': col,
                                    'orientation': orientation
                                })
                                
                                await websocket.send_json({
                                    "type": "ship_placed",
                                    "player": player,
                                    "ship": ship_name,
                                    "size": ship_size,
                                    "position": {"row": row, "col": col},
                                    "orientation": orientation,
                                    "board": game.game_state[f'player{player}_board']
                                })
                                
                                await asyncio.sleep(0.1)
                                placed = True
                            
                            attempts += 1
                
                await websocket.send_json({
                    "type": "placement_complete",
                    "message": "All ships placed! Game starting...",
                    "player1Board": game.game_state['player1_board'],
                    "player2Board": game.game_state['player2_board']
                })
                
                await asyncio.sleep(0.5)
                
                # Game loop
                game.status = "active"
                while game.status == "active" and not game.winner:
                    current_player = game.current_player
                    max_retries = 5
                    retry_count = 0
                    
                    while retry_count < max_retries:
                        prompt = game.get_prompt_for_player(current_player)
                        
                        if current_player == 1:
                            move_response = game.player1.get_move(prompt, game.game_state)
                        else:
                            move_response = game.player2.get_move(prompt, game.game_state)
                        
                        try:
                            move_str = move_response.strip()
                            
                            if len(move_str) >= 2 and move_str[0].isalpha() and move_str[1].isdigit():
                                col_letter = move_str[0].upper()
                                row_num = int(move_str[1:])
                                col_idx = ord(col_letter) - ord('A')
                                row_idx = row_num - 1
                            else:
                                move = json.loads(move_response)
                                if 'col' in move and 'row' in move:
                                    col_idx = ord(move['col'].upper()) - ord('A')
                                    row_idx = move['row'] - 1
                                else:
                                    raise ValueError("Invalid move format")
                            
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
                                    break
                                
                                await asyncio.sleep(0.3)
                                break
                            else:
                                print(f"Invalid move from player {current_player}: {move_result.get('result', 'unknown error')}")
                                retry_count += 1
                                
                        except Exception as e:
                            print(f"Error processing move: {e}")
                            retry_count += 1
                            continue
            
    except WebSocketDisconnect:
        print(f"Client disconnected from battleship game {game_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")

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
        
        # Map model IDs to backend format
        def map_model_to_backend(model_id):
            if not model_id:
                return "openai"  # default fallback
            model_id = model_id.lower()
            if "gpt" in model_id or "openai" in model_id:
                return "openai"
            elif "claude" in model_id or "anthropic" in model_id:
                return "anthropic"
            elif "gemini" in model_id or "google" in model_id:
                return "gemini"
            elif "groq" in model_id or "mixtral" in model_id or "llama" in model_id:
                return "groq"
            else:
                return "openai"  # default fallback
        
        player1_backend = map_model_to_backend(request.player1_model)
        player2_backend = map_model_to_backend(request.player2_model)
        
        print(f"Starting trivia game with models: {request.player1_model} ({player1_backend}) vs {request.player2_model} ({player2_backend})")
        
        trivia_game = TriviaGame(
            player1_model=player1_backend,
            player2_model=player2_backend,
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
            "player1_model": request.player1_model or "openai",
            "player2_model": request.player2_model or "anthropic"
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
    detailed_reasoning = parse_reasoning_for_ui(model, reasoning, model_data['guesses'], model_data['feedback'])
    
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
    detailed_reasoning = parse_reasoning_for_ui(model, reasoning, model_data['guesses'], model_data['feedback'])
    
    return {
        "guess": guess,
        "reasoning": reasoning,
        "detailed_reasoning": detailed_reasoning,
        "feedback": result['feedback'],
        "game_over": result['game_over'],
        "winner": result['winner']
    }

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
            "wordle": {"active": len(wordle_games)}
        },
        "endpoints": {
            "battleship": "/games/battleship/{game_id}",
            "trivia": "/api/trivia/*",
            "wordle": "/api/wordle/*"
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
            "wordle": "ready"
        }
    }

@app.get("/api/default-models")
async def get_default_models():
    """Get default model configurations for all games"""
    return {
        "default_models": DEFAULT_MODELS,
        "supported_models": ["openai", "anthropic", "gemini", "groq"]
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
    print("-" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 