from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import uvicorn
from typing import Dict
import uuid
import random

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

@app.websocket("/games/{game_type}/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_type: str, game_id: str):
    await websocket.accept()
    print(f"Client connected to game {game_id}")
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_json()
            
            if data.get("type") == "start_game":
                # Start the appropriate game
                if game_type == "battleship":
                    player1_model = data.get("player1Model", "openai")
                    player2_model = data.get("player2Model", "anthropic")
                    auto_place = data.get("autoPlaceShips", True)
                    
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
                    
                    # Place ships for both players with visualization
                    for player in [1, 2]:
                        await websocket.send_json({
                            "type": "placement_start",
                            "player": player,
                            "message": f"Player {player} ({game.player1_model if player == 1 else game.player2_model}) is placing ships..."
                        })
                        
                        # Place each ship with a delay for visualization
                        for ship_name, ship_size in game.ships.items():
                            # For now, place ships randomly (AI placement can be added later)
                            placed = False
                            attempts = 0
                            
                            while not placed and attempts < 100:
                                row = random.randint(0, game.board_size - 1)
                                col = random.randint(0, game.board_size - 1)
                                orientation = random.choice(['horizontal', 'vertical'])
                                
                                if game._can_place_ship(game.game_state[f'player{player}_board'], row, col, ship_size, orientation):
                                    # Place the ship
                                    game.place_ship(player, {
                                        'id': ship_name,
                                        'size': ship_size,
                                        'row': row,
                                        'col': col,
                                        'orientation': orientation
                                    })
                                    
                                    # Send placement update
                                    await websocket.send_json({
                                        "type": "ship_placed",
                                        "player": player,
                                        "ship": ship_name,
                                        "size": ship_size,
                                        "position": {"row": row, "col": col},
                                        "orientation": orientation,
                                        "board": game.game_state[f'player{player}_board']
                                    })
                                    
                                    # Add small delay for visualization
                                    await asyncio.sleep(0.1)
                                    placed = True
                                    
                                attempts += 1
                    
                    # Send placement complete
                    await websocket.send_json({
                        "type": "placement_complete",
                        "message": "All ships placed! Game starting...",
                        "player1Board": game.game_state['player1_board'],
                        "player2Board": game.game_state['player2_board']
                    })
                    
                    await asyncio.sleep(0.5)  # Short pause before starting game
                    
                    # Game loop
                    game.status = "active"
                    while game.status == "active" and not game.winner:
                        try:
                            # Get current player's move
                            current_player = game.current_player
                            max_retries = 5  # Reduced from 10
                            retry_count = 0
                            
                            while retry_count < max_retries:
                                # Use the improved prompt from the game
                                prompt = game.get_prompt_for_player(current_player)
                                
                                if current_player == 1:
                                    move_response = game.player1.get_move(prompt, game.game_state)
                                else:
                                    move_response = game.player2.get_move(prompt, game.game_state)
                                
                                # Parse and execute move
                                try:
                                    # Extract move from response (handle various formats)
                                    move_str = move_response.strip()
                                    
                                    # If it's a coordinate like "A5" or "H8"
                                    if len(move_str) >= 2 and move_str[0].isalpha() and move_str[1].isdigit():
                                        col_letter = move_str[0].upper()
                                        row_num = int(move_str[1:])
                                        col_idx = ord(col_letter) - ord('A')
                                        row_idx = row_num - 1
                                    else:
                                        # Try to parse JSON format
                                        move = json.loads(move_response)
                                        if 'col' in move and 'row' in move:
                                            col_idx = ord(move['col'].upper()) - ord('A')
                                            row_idx = move['row'] - 1
                                        else:
                                            raise ValueError("Invalid move format")
                                    
                                    # Make the move
                                    move_result = game.make_move(row_idx, col_idx)
                                    
                                    # Only send update if move was successful
                                    if move_result["success"]:
                                        # Send updated game state
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
                                        
                                        # Check if game is over
                                        if game.winner:
                                            game.status = "finished"
                                            await websocket.send_json({
                                                "type": "game_over",
                                                "winner": game.winner,
                                                "message": f"🎉 Player {game.winner} ({game.player1_model if game.winner == 1 else game.player2_model}) wins!"
                                            })
                                            break
                                        
                                        # Reduced delay between moves from 1.5s to 0.3s
                                        await asyncio.sleep(0.3)
                                        break  # Exit retry loop on successful move
                                    else:
                                        # If move failed, try again
                                        print(f"Invalid move from player {current_player}: {move_result.get('result', 'unknown error')}")
                                        retry_count += 1
                                        if retry_count >= max_retries:
                                            print(f"Player {current_player} exceeded retry limit")
                                            # Make a random valid move
                                            for _ in range(100):  # Try to find a valid random move
                                                rand_row = random.randint(0, game.board_size - 1)
                                                rand_col = random.randint(0, game.board_size - 1)
                                                if game.game_state[f'player{current_player}_shots'][rand_row][rand_col] is None:
                                                    move_result = game.make_move(rand_row, rand_col)
                                                    if move_result["success"]:
                                                        col_letter = chr(rand_col + ord('A'))
                                                        await websocket.send_json({
                                                            "type": "game_state",
                                                            "currentPlayer": game.current_player,
                                                            "player1Shots": game.game_state["player1_shots"],
                                                            "player2Shots": game.game_state["player2_shots"],
                                                            "lastMove": f"{col_letter}{rand_row + 1}",
                                                            "lastResult": move_result["result"],
                                                            "message": f"Player {3 - game.current_player} fired randomly at {col_letter}{rand_row + 1} - {move_result['result'].upper()}!",
                                                            "status": "finished" if game.winner else "in_progress",
                                                            "winner": game.winner
                                                        })
                                                        break
                                            break
                                except json.JSONDecodeError as e:
                                    print(f"Invalid move format from player {current_player}: {move_response}")
                                    retry_count += 1
                                    continue
                                except Exception as e:
                                    print(f"Error processing move: {e}")
                                    retry_count += 1
                                    continue
                                    
                        except Exception as e:
                            print(f"Error in game loop: {e}")
                            await websocket.send_json({
                                "type": "error",
                                "message": f"Game error: {str(e)}"
                            })
                            break
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Game type {game_type} not implemented yet"
                    })
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {data.get('type')}"
                })
                
    except WebSocketDisconnect:
        print(f"Client disconnected from game {game_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass  # Connection might be closed

@app.get("/")
async def root():
    return {"message": "Versus Game Server", "active_games": len(active_games)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001) 