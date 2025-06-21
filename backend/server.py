from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import uvicorn
from typing import Dict
import uuid

# Import game implementations
from battleship.battleship import BattleshipGame

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active games
active_games: Dict[str, Dict] = {}

class GameManager:
    def __init__(self, game_id: str, game_type: str, player1_model: str, player2_model: str):
        self.game_id = game_id
        self.game_type = game_type
        self.websocket = None
        
        # Initialize the appropriate game
        if game_type == "battleship":
            self.game = BattleshipGame(player1_model, player2_model)
        else:
            raise ValueError(f"Unknown game type: {game_type}")
    
    async def handle_message(self, message: dict):
        """Handle messages from the frontend"""
        msg_type = message.get("type")
        
        if msg_type == "start_game":
            # Handle game start
            player1_ships = message.get("player1Ships", None)
            
            # Place ships for player 1 (human placed)
            if player1_ships and self.game_type == "battleship":
                self.game.place_ships_for_player(1, player1_ships)
            
            # Place ships for player 2 (AI places randomly)
            if self.game_type == "battleship":
                self.game.place_ships_for_player(2)
            
            # Send initial game state
            await self.send_game_state({
                "setupComplete": True,
                "message": f"{message.get('player1Model')} vs {message.get('player2Model')} - Game started!"
            })
            
            # Start the game loop
            asyncio.create_task(self.run_game_loop())
    
    async def run_game_loop(self):
        """Main game loop"""
        await asyncio.sleep(1)  # Small delay before starting
        
        while not self.game.game_over:
            try:
                # Play one turn
                result = await self.game.play_turn()
                
                # Send updated game state
                await self.send_game_state({
                    "currentPlayer": self.game.current_player,
                    "player1Shots": self.game.game_state.get("player1_shots"),
                    "player2Shots": self.game.game_state.get("player2_shots"),
                    "lastMove": result.get("move"),
                    "message": self._get_game_message(result),
                    "status": "finished" if self.game.game_over else "in_progress",
                    "winner": self.game.winner
                })
                
                # Add delay between moves for visibility
                if not self.game.game_over:
                    await asyncio.sleep(2)
                    
            except Exception as e:
                print(f"Error in game loop: {e}")
                await self.send_error(f"Game error: {str(e)}")
                break
    
    def _get_game_message(self, result: dict) -> str:
        """Generate appropriate game message"""
        if result.get("success"):
            move = result.get("move")
            player = 3 - result.get("player")  # Show who just moved
            player_name = f"Player {player}"
            
            if self.game.game_over:
                winner_name = f"Player {self.game.winner}"
                return f"🎉 {winner_name} wins!"
            else:
                last_result = self.game.game_state["last_moves"][-1]["result"] if self.game.game_state.get("last_moves") else "miss"
                return f"{player_name} fired at {move} - {last_result.upper()}!"
        else:
            return "Waiting for valid move..."
    
    async def send_game_state(self, additional_data: dict = None):
        """Send game state to frontend"""
        if self.websocket:
            data = {
                "type": "game_state",
                "state": {
                    "currentPlayer": self.game.current_player,
                    "gameOver": self.game.game_over,
                    "winner": self.game.winner,
                    **additional_data
                }
            }
            await self.websocket.send_json(data)
    
    async def send_error(self, error_message: str):
        """Send error message to frontend"""
        if self.websocket:
            await self.websocket.send_json({
                "type": "error",
                "message": error_message
            })

@app.websocket("/games/{game_type}/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_type: str, game_id: str):
    await websocket.accept()
    
    manager = None
    try:
        while True:
            # Receive message from frontend
            data = await websocket.receive_json()
            
            # Create game manager if not exists
            if game_id not in active_games:
                manager = GameManager(
                    game_id,
                    game_type,
                    data.get("player1Model", "OPENAI"),
                    data.get("player2Model", "ANTHROPIC")
                )
                manager.websocket = websocket
                active_games[game_id] = manager
            else:
                manager = active_games[game_id]
                manager.websocket = websocket
            
            # Handle the message
            await manager.handle_message(data)
            
    except WebSocketDisconnect:
        print(f"Client disconnected from game {game_id}")
        if game_id in active_games:
            del active_games[game_id]
    except Exception as e:
        print(f"WebSocket error: {e}")
        if manager:
            await manager.send_error(str(e))

@app.get("/")
async def root():
    return {"message": "Versus Game Server", "active_games": len(active_games)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001) 