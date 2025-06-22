#!/usr/bin/env python3
"""
VERSUS - Main Server Entry Point
"""

import sys
import os

# Add backend to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.api.server import app
import uvicorn

def main():
    """Start the VERSUS unified game server"""
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
    print("-" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main() 