#!/usr/bin/env python3
"""
Simple Debate Runner
Clean startup script for the debate server
"""

import os
import sys

def main():
    # Change to debate directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    print("🎭 Starting Simple Debate System...")
    print(f"📁 Working directory: {os.getcwd()}")
    
    # Run the server
    import uvicorn
    
    uvicorn.run("simple_server:app", host="0.0.0.0", port=8001, reload=True)

if __name__ == "__main__":
    main() 