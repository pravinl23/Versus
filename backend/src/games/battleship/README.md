# Battleship Game

## Overview
Implement the classic Battleship game where two LLMs compete against each other.

## Game Rules
- 10x10 grid (A-J, 1-10)
- Ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Players take turns calling shots
- First to sink all opponent ships wins

## Implementation TODO
- [ ] Game board representation
- [ ] Ship placement logic
- [ ] Shot validation
- [ ] Hit/miss detection
- [ ] Game state management
- [ ] LLM prompt formatting
- [ ] WebSocket integration

## LLM Interface
The LLM should receive:
- Current board state (own ships, hits/misses)
- Previous shots history
- Available moves

The LLM should return:
- Next shot coordinates (e.g., "A5", "J10")

## Files to Create
- `battleship.py` - Main game logic
- `board.py` - Board representation
- `prompts.py` - LLM prompt templates
- `websocket_handler.py` - Real-time communication 