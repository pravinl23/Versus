"""
FastAPI server for Trivia game mode
Handles game sessions, WebSocket connections, and real-time updates
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import uuid
import asyncio

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from trivia_game import TriviaGame
from questions import TRIVIA_QUESTIONS, get_random_questions

app = FastAPI(title="VERSUS Trivia API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class GameStartRequest(BaseModel):
    player1_model: str
    player2_model: str
    question_count: Optional[int] = 20

class GameSession:
    def __init__(self, game_id: str, trivia_game: TriviaGame):
        self.game_id = game_id
        self.trivia_game = trivia_game
        self.websockets: List[WebSocket] = []
        self.current_question_index = 0
        self.is_active = True

# Global game sessions storage
game_sessions: Dict[str, GameSession] = {}

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

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_game(self, message: str, game_id: str):
        if game_id in self.active_connections:
            for connection in self.active_connections[game_id]:
                try:
                    await connection.send_text(message)
                except:
                    pass  # Connection might be closed

manager = ConnectionManager()

@app.get("/api/trivia/questions")
async def get_questions():
    """Get all available trivia questions"""
    return {"questions": TRIVIA_QUESTIONS}

@app.get("/api/trivia/models")
async def get_supported_models():
    """Get list of supported LLM models"""
    return {
        "models": [
            {"id": "OPENAI", "name": "GPT-4", "description": "OpenAI GPT-4"},
            {"id": "ANTHROPIC", "name": "Claude 3", "description": "Anthropic Claude 3"},
            {"id": "GEMINI", "name": "Gemini Pro", "description": "Google Gemini Pro"},
            {"id": "GROQ", "name": "Mixtral", "description": "Groq Mixtral 8x7B"}
        ]
    }

@app.post("/api/trivia/start")
async def start_trivia_game(request: GameStartRequest):
    """Start a new trivia game session"""
    try:
        # Generate unique game ID
        game_id = str(uuid.uuid4())
        
        # Get random questions
        questions = get_random_questions(request.question_count)
        
        # Create trivia game instance
        trivia_game = TriviaGame(
            player1_model=request.player1_model,
            player2_model=request.player2_model,
            questions=questions
        )
        
        # Store game session
        game_sessions[game_id] = GameSession(game_id, trivia_game)
        
        return {
            "game_id": game_id,
            "status": "started",
            "total_questions": len(questions),
            "player1_model": request.player1_model,
            "player2_model": request.player2_model
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start game: {str(e)}")

@app.get("/api/trivia/game/{game_id}/status")
async def get_game_status(game_id: str):
    """Get current game status"""
    if game_id not in game_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = game_sessions[game_id]
    game = session.trivia_game
    
    return {
        "game_id": game_id,
        "current_question": game.current_question_index,
        "total_questions": len(game.questions),
        "player1_score": game.player1_score,
        "player2_score": game.player2_score,
        "game_over": game.game_over,
        "winner": game.winner,
        "is_active": session.is_active
    }

@app.post("/api/trivia/game/{game_id}/player/{player}/next-question")
async def player_next_question(game_id: str, player: int):
    """Process next question for a specific player in the race"""
    if game_id not in game_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = game_sessions[game_id]
    game = session.trivia_game
    
    if game.game_over:
        return {"error": "Race is already over"}
    
    if player not in [1, 2]:
        raise HTTPException(status_code=400, detail="Player must be 1 or 2")
    
    try:
        # Ask question to specific player
        result = await game.ask_question_to_player(player)
        
        # Broadcast result to all connected clients
        await manager.broadcast_to_game(
            json.dumps({
                "type": "player_question_result",
                "data": result
            }),
            game_id
        )
        
        # Check if race is over
        if game.race_finished:
            final_results = game.get_final_results()
            await manager.broadcast_to_game(
                json.dumps({
                    "type": "race_finished",
                    "data": final_results
                }),
                game_id
            )
            session.is_active = False
        
        return result
        
    except Exception as e:
        error_msg = f"Error processing question for player {player}: {str(e)}"
        await manager.broadcast_to_game(
            json.dumps({
                "type": "error",
                "message": error_msg
            }),
            game_id
        )
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/trivia/game/{game_id}/player/{player}/current-question")
async def get_player_current_question(game_id: str, player: int):
    """Get the current question for a specific player"""
    if game_id not in game_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = game_sessions[game_id]
    game = session.trivia_game
    
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

@app.get("/api/trivia/game/{game_id}/results")
async def get_game_results(game_id: str):
    """Get final game results"""
    if game_id not in game_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = game_sessions[game_id]
    game = session.trivia_game
    
    if not game.game_over:
        raise HTTPException(status_code=400, detail="Game is not finished yet")
    
    return game.get_final_results()

@app.websocket("/api/trivia/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for real-time game updates"""
    await manager.connect(websocket, game_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            
            # Handle client messages if needed
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                pass  # Ignore malformed messages
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)

@app.delete("/api/trivia/game/{game_id}")
async def cleanup_game(game_id: str):
    """Clean up game session"""
    if game_id in game_sessions:
        # Notify all connected clients
        await manager.broadcast_to_game(
            json.dumps({
                "type": "game_ended",
                "message": "Game session ended"
            }),
            game_id
        )
        
        # Remove game session
        del game_sessions[game_id]
        
        return {"message": "Game session cleaned up"}
    
    raise HTTPException(status_code=404, detail="Game not found")

@app.get("/api/trivia/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_games": len(game_sessions),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 