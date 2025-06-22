#!/usr/bin/env python3
"""
Test script to check debate imports
"""

print("Testing debate imports...")

try:
    import sys
    import os
    
    # Add current directory to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    print("✅ Basic imports OK")
    
    # Test common imports
    from common import BaseGame, LLMClient
    print("✅ common.py imports OK")
    
    # Test debate imports
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'debate'))
    from debate_game import VoiceDebateGame
    print("✅ debate_game.py imports OK")
    
    # Test creating a debate instance
    debate = VoiceDebateGame("OPENAI", "ANTHROPIC", "Test topic", 6)
    print("✅ VoiceDebateGame creation OK")
    
    print("🎉 All tests passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 