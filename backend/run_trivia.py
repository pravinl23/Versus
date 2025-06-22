#!/usr/bin/env python3
"""
Simple startup script for the VERSUS Trivia server
Run this to start the trivia game backend
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from trivia.server import app
import uvicorn

if __name__ == "__main__":
    print("🎮 Starting VERSUS Trivia Server...")
    print("📝 Navigate to http://localhost:3000 to access the frontend")
    print("🔧 API docs available at http://localhost:8000/docs")
    print("❌ Press Ctrl+C to stop the server")
    print("-" * 50)
    
    uvicorn.run(
        "trivia.server:app", 
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    ) 