# Wordle AI Battle

This is an implementation of Wordle where two AI models (OpenAI's GPT-4o and Anthropic's Claude) compete against each other to guess a secret 5-letter word.

## Features

- **NYTimes-style UI**: Exact replica of the official Wordle interface
- **Split-screen layout**: Watch both AI models play simultaneously
- **Real-time gameplay**: See each guess appear with animated tile flips
- **AI reasoning display**: Understand why each model made their guess
- **Simulated AI responses**: Works without API keys for testing

## Architecture

### Backend (`wordle_simple.py`)
- Flask API server running on port 5001
- Endpoints:
  - `POST /api/wordle/start` - Start a new game with a secret word
  - `GET /api/wordle/state` - Get current game state
  - `POST /api/wordle/guess` - Get next AI guess

### Frontend Components
- `WordleGame.jsx` - Main game container and state management
- `StartBattleModal.jsx` - Modal for entering the secret word
- `WordleBoard.jsx` - 6x5 grid display for each player
- `Tile.jsx` - Individual letter tile with color feedback
- `ReasoningBox.jsx` - Display AI reasoning for each guess
- `useWordleGameLoop.js` - Custom hook for game loop logic

## Running the Game

1. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Start the backend server:
   ```bash
   cd backend/wordle
   python wordle_simple.py
   ```

3. In another terminal, start the frontend:
   ```bash
   cd versus-frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:5173 in your browser
5. Select "Wordle" from the game menu
6. Choose "OPENAI" and "ANTHROPIC" as the two models
7. Click "START GAME"
8. Enter a 5-letter word and watch the AI battle!

## Game Rules

- Each AI gets 6 attempts to guess the word
- Feedback is provided after each guess:
  - **Green**: Letter is correct and in the right position
  - **Yellow**: Letter is in the word but wrong position
  - **Gray**: Letter is not in the word
- The first AI to guess correctly wins
- If neither guesses within 6 attempts, it's a draw

## API Integration

The current implementation uses simulated AI responses. To integrate with real AI APIs:

1. Update `backend/wordle/wordle_game.py` with actual API calls
2. Ensure API keys are set in `.env`:
   ```
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```
3. Update the frontend to use the appropriate backend file

## Future Enhancements

- Replay mode to review the game
- Turn timer/countdown
- Audio narration of moves
- Statistics tracking
- More sophisticated AI strategies
