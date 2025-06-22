import asyncio
import websockets
import json

async def test_battleship():
    uri = "ws://localhost:8001/games/battleship/test-game-123"
    
    async with websockets.connect(uri) as websocket:
        print("Connected to server")
        
        # Send start_game message
        start_message = {
            "type": "start_game",
            "player1Model": "openai",
            "player2Model": "anthropic",
            "autoPlaceShips": True
        }
        
        await websocket.send(json.dumps(start_message))
        print("Sent start_game message")
        
        # Listen for messages
        try:
            for i in range(20):  # Listen for up to 20 messages
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"Received: {data.get('type', 'unknown')} - {data.get('message', '')}")
                
                if data.get('type') == 'error':
                    print(f"Error: {data.get('message')}")
                    break
                elif data.get('type') == 'game_over':
                    print("Game over!")
                    break
                    
        except asyncio.TimeoutError:
            print("Timeout waiting for message")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_battleship()) 