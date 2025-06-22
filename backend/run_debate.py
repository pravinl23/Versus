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
    
    # Check for environment file
    env_file = current_dir.parent / '.env'
    if env_file.exists():
        print(f"✅ Found .env file: {env_file}")
    else:
        print(f"⚠️  No .env file found. Copy {current_dir.parent / 'env.example'} to {env_file}")

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'websockets',
        'httpx',
        'openai',
        'anthropic'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("📦 Install with: pip install -r requirements.txt")
        return False
    
    print("✅ All required packages installed")
    return True

def check_api_keys():
    """Check for API keys and provide setup instructions"""
    print("\n🔑 Checking API Keys...")
    
    keys_status = {}
    api_keys = {
        'OPENAI_API_KEY': 'OpenAI (GPT-4)',
        'ANTHROPIC_API_KEY': 'Anthropic (Claude)',
        'GEMINI_API_KEY': 'Google (Gemini Pro)',
        'GROQ_API_KEY': 'Groq (Mixtral)',
        'VAPI_API_KEY': 'Vapi (Voice Synthesis)'
    }
    
    for key, service in api_keys.items():
        if os.getenv(key):
            keys_status[key] = True
            print(f"  ✅ {service}: Found")
        else:
            keys_status[key] = False
            print(f"  ❌ {service}: Missing")
    
    if not any(keys_status.values()):
        print("\n⚠️  No API keys found!")
        print("🔧 Set up your .env file with API keys to enable LLM functionality")
    elif not keys_status.get('VAPI_API_KEY'):
        print("\n⚠️  Vapi API key missing - voice synthesis will use browser TTS fallback")
    else:
        print("\n🎉 All API keys configured!")
    
    return keys_status

def run_server():
    """Run the FastAPI server"""
    print("\n🚀 Starting Voice Debate Arena Server...")
    print("=" * 50)
    
    try:
        # Change to the debate directory (subdirectory of current script location)
        backend_dir = Path(__file__).parent
        debate_dir = backend_dir / 'debate'
        os.chdir(debate_dir)
        print(f"📂 Changed to debate directory: {debate_dir}")
        
        # Run uvicorn server
        cmd = [
            sys.executable, '-m', 'uvicorn',
            'server:app',
            '--host', os.getenv('HOST', '0.0.0.0'),
            '--port', os.getenv('PORT', '8003'),
            '--reload' if os.getenv('RELOAD', 'True').lower() == 'true' else '--no-reload'
        ]
        
        print(f"📍 Server URL: http://localhost:{os.getenv('PORT', '8003')}")
        print(f"📍 API Docs: http://localhost:{os.getenv('PORT', '8003')}/docs")
        print(f"🎭 Debate Arena: Ready for voice-powered AI debates!")
        print("=" * 50)
        
        # Run the server
        subprocess.run(cmd, check=True)
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Server failed to start: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

def main():
    """Main function"""
    print("🎭 Voice-Powered AI Debate Arena")
    print("=" * 40)
    
    # Setup environment
    setup_environment()
    
    # Check dependencies
    if not check_dependencies():
        print("\n📝 Install missing dependencies and try again")
        sys.exit(1)
    
    # Check API keys
    check_api_keys()
    
    # Small delay for user to read messages
    print("\n⏳ Starting server in 2 seconds...")
    time.sleep(2)
    
    # Run the server
    run_server()

if __name__ == "__main__":
    main() 