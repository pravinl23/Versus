#!/usr/bin/env python3
"""
Startup script for Voice-Powered AI Debate Arena
Runs the FastAPI server with proper environment and error handling
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def setup_environment():
    """Setup environment variables and paths"""
    # Add current directory to Python path
    current_dir = Path(__file__).parent
    sys.path.insert(0, str(current_dir))
    
    # Set default environment variables if not present
    env_vars = {
        'PYTHONPATH': str(current_dir),
        'HOST': '0.0.0.0',
        'PORT': '8003',
        'RELOAD': 'True'
    }
    
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
    
    print("🔧 Environment setup complete")
    
    # Check for required environment variables
    required_vars = ['OPENAI_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"⚠️  Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("   Some LLM models may not work without proper API keys")
        print("   Please set them in your environment or .env file")
    
    # Check for optional but recommended variables
    optional_vars = ['ANTHROPIC_API_KEY', 'GROQ_API_KEY', 'VAPI_API_KEY']
    for var in optional_vars:
        if os.getenv(var):
            print(f"✅ {var} is set")
        else:
            print(f"⚠️  {var} not set - {var.split('_')[0]} features will be limited")

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'websockets',
        'httpx',
        'pydantic'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing required packages: {', '.join(missing_packages)}")
        print("   Please install them with: pip install -r requirements.txt")
        return False
    
    print("✅ All required dependencies are installed")
    return True

def start_server():
    """Start the FastAPI server"""
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 8003))
    reload = os.getenv('RELOAD', 'True').lower() == 'true'
    
    print("\n🎭 Starting Voice-Powered AI Debate Arena Server...")
    print(f"🌐 Server will run on: http://{host}:{port}")
    print(f"📡 WebSocket endpoint: ws://{host}:{port}/api/debate/ws/{{debate_id}}")
    print(f"🔄 Auto-reload: {'Enabled' if reload else 'Disabled'}")
    print("\n📋 Available endpoints:")
    print(f"   • POST /api/debate/start - Start new debate")
    print(f"   • POST /api/debate/{{id}}/next-round - Advance round")
    print(f"   • POST /api/debate/{{id}}/auto-advance - Auto-run entire debate")
    print(f"   • GET /api/debate/{{id}}/state - Get debate state")
    print(f"   • WebSocket /api/debate/ws/{{id}} - Real-time updates")
    print("\n🚀 Starting server...\n")
    
    try:
        # Change to debate directory
        os.chdir(Path(__file__).parent / 'debate')
        
        # Start the server
        cmd = [
            sys.executable, '-m', 'uvicorn',
            'server:app',
            '--host', host,
            '--port', str(port),
            '--log-level', 'info'
        ]
        
        if reload:
            cmd.append('--reload')
        
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)

def main():
    """Main function"""
    print("🎭 VERSUS: Voice-Powered AI Debate Arena")
    print("=" * 50)
    
    # Setup environment
    setup_environment()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Start server
    start_server()

if __name__ == "__main__":
    main() 