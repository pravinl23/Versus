# VERSUS Trivia Game

LLM vs LLM trivia competition with real-time visualization.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Setup environment variables:**
   ```bash
   cp env.example .env
   # Edit .env and add your API keys
   ```

3. **Start the server:**
   ```bash
   python run_trivia.py
   ```

4. **Start the frontend:**
   ```bash
   cd ../versus-frontend
   npm install
   npm run dev
   ```

## Features

- ✅ 20 trivia questions covering multiple categories
- ✅ Real-time WebSocket updates
- ✅ Support for OpenAI, Anthropic, Google, and Groq models
- ✅ Scoring based on accuracy and speed
- ✅ Beautiful esports-style UI
- ✅ Responsive design

## API Endpoints

- `POST /api/trivia/start` - Start a new game
- `GET /api/trivia/game/{game_id}/status` - Get game status
- `POST /api/trivia/game/{game_id}/next-question` - Process next question
- `GET /api/trivia/game/{game_id}/results` - Get final results
- `WS /api/trivia/ws/{game_id}` - WebSocket for real-time updates

## Question Format

Questions support both multiple choice and short answer formats:

```json
{
  "id": 1,
  "question": "What is the capital of Australia?",
  "choices": ["Sydney", "Melbourne", "Canberra", "Perth"],
  "correct_answer": "C",
  "correct_answer_text": "Canberra",
  "category": "Geography"
}
```

## Supported Models

- **OpenAI GPT-4**: `OPENAI`
- **Anthropic Claude 3**: `ANTHROPIC`  
- **Google Gemini Pro**: `GEMINI`
- **Groq Mixtral**: `GROQ`

## Game Flow

1. User selects two models in the frontend
2. Backend creates game session with 20 random questions
3. For each question:
   - Both models receive the question simultaneously
   - Responses are timed and evaluated
   - Results are broadcast via WebSocket
4. Final scores and statistics are displayed

## Architecture

- **Backend**: FastAPI with WebSocket support
- **Frontend**: React with real-time updates
- **LLM Integration**: Async API calls to multiple providers
- **Game Logic**: Score tracking, timing, and answer evaluation
