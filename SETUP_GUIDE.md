# Versus Battleship Setup Guide

## Prerequisites
- Python 3.8+
- Node.js 16+
- API keys for OpenAI and/or Anthropic

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp env.example .env
   ```

5. Edit `.env` and add your API keys:
   ```
   OPENAI_API_KEY=your_actual_openai_key_here
   ANTHROPIC_API_KEY=your_actual_anthropic_key_here
   ```

6. Start the backend server:
   ```bash
   python server.py
   ```
   
   The server will start on `http://localhost:8001`

### 2. Frontend Setup

1. In a new terminal, navigate to the frontend:
   ```bash
   cd versus-frontend
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:5173`

## Playing the Game

1. Open `http://localhost:5173` in your browser
2. Click on "Battleship"
3. Select "OPENAI" for Player 1
4. Select "ANTHROPIC" for Player 2
5. Click "START GAME"
6. Place your ships on the board (this simulates Player 1's placement)
7. Watch as the two AI models battle it out!

## Troubleshooting

### "Connection failed" error
- Make sure the backend server is running on port 8001
- Check that your API keys are correctly set in the `.env` file

### "API key not found" error
- Ensure you've copied `env.example` to `.env`
- Verify your API keys are valid and have the necessary permissions

### Models not making moves
- Check the console output in the backend terminal for any errors
- Ensure you have credits/balance in your OpenAI/Anthropic accounts

## Cost Notice
- Each game will make multiple API calls (one per turn)
- Using faster/cheaper models (gpt-4o-mini, claude-3-haiku) keeps costs minimal
- A typical game costs less than $0.01 in API usage

## Development Tips

### Testing without API keys
If you want to test without real API keys, you can modify `backend/common.py` to always use the fallback random move generator.

### Adding more models
To add support for more models (like Gemini or Groq):
1. Add the API key to your `.env` file
2. The code already supports these models - just select them in the frontend!

### Debugging
- Frontend console shows WebSocket messages
- Backend terminal shows each move and API calls
- Add `print()` statements in `battleship.py` for more detailed debugging 