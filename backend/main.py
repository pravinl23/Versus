#!/usr/bin/env python3
"""
VERSUS - Main Server Entry Point
"""

import sys
import os
import socket

# Add backend to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.api.server import app
import uvicorn

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a remote server to get local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except:
        return "localhost"

def main():
    """Start the VERSUS unified game server"""
    local_ip = get_local_ip()
    
    print("🎮 Starting VERSUS Unified Game Server...")
    print("📝 Server running on:")
    print(f"   • Local:   http://localhost:8000")
    if local_ip != "localhost":
        print(f"   • Network: http://{local_ip}:8000")
    print("🔧 API docs available at http://localhost:8000/docs")
    print("📱 QR codes will use network IP for phone access")
    print("❌ Press Ctrl+C to stop the server")
    print("-" * 50)
    print("Available games:")
    print("  - Battleship: WebSocket at /games/battleship/{game_id}")
    print("  - Trivia: API at /api/trivia/*")
    print("  - Wordle: API at /api/wordle/*")
    print("  - NYT Connections: API at /api/connections/*")
    print("  - Voting: API at /api/vote/*")
    print("-" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main() 