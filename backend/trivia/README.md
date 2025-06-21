# VERSUS Trivia Race Game

## Overview

The **Trivia Race** is a real-time competitive game mode where two Large Language Models (LLMs) race to complete 20 trivia questions as quickly as possible. Unlike traditional turn-based trivia, this is a **split-screen racing format** where each model progresses independently through questions at their own pace. The first model to finish all 20 questions wins the race.

## 🏁 Race Format

### How It Works
1. **Simultaneous Start**: Both models begin answering Question 1 at the same time
2. **Independent Progression**: Each model advances to their next question immediately after responding (regardless of correctness)
3. **Real-Time Competition**: No waiting for the other model - pure speed race
4. **First to Finish Wins**: The first model to complete all 20 questions is declared the winner
5. **Live Visualization**: Split-screen interface shows real-time progress, questions, and responses

### Race Mechanics
- **Parallel Processing**: Both models answer different questions simultaneously
- **No Turn-Taking**: Each model progresses at their own speed
- **Immediate Advancement**: Models move to next question after each response
- **Live Progress Tracking**: Real-time progress bars and question counters
- **Winner Declaration**: Game ends immediately when first model finishes

## 🛠 Technical Architecture

### Backend Stack

#### Core Technologies
- **FastAPI** (0.104.1): Modern async web framework for Python
- **uvicorn** (0.24.0): ASGI server with WebSocket support
- **WebSockets** (12.0): Real-time bidirectional communication
- **python-dotenv** (1.0.0): Environment variable management
- **pydantic** (2.5.0): Data validation and serialization
- **httpx** (0.25.0): Async HTTP client for LLM API calls

#### LLM Integration Libraries
- **openai** (1.35.7): OpenAI GPT models integration
- **anthropic** (0.29.0): Anthropic Claude models integration  
- **google-generativeai** (0.3.0): Google Gemini models integration
- **groq** (0.9.0): Groq Mixtral models integration

#### Game Logic Components
- **BaseGame Class**: Abstract base for all VERSUS games
- **TriviaGame Class**: Race-specific game logic and state management
- **LLMClient Class**: Unified interface for different LLM providers

### Frontend Stack
- **React** (19.1.0): Component-based UI framework
- **Vite** (6.3.5): Fast build tool and dev server
- **WebSocket API**: Real-time communication with backend
- **CSS Grid/Flexbox**: Split-screen racing layout

## 📁 File Structure

```
backend/trivia/
├── trivia_game.py      # Main race game logic
├── questions.py        # Question bank (20 trivia questions)
├── server.py          # FastAPI server with WebSocket endpoints
└── README.md          # This documentation
```

## 🎮 Game Flow Architecture

### 1. Game Initialization
```python
# Create game instance with 20 questions
trivia_game = TriviaGame(
    player1_model="OPENAI",
    player2_model="ANTHROPIC", 
    questions=get_random_questions(20)
)
```

### 2. Race State Management
Each player has independent state tracking:
```python
# Player 1 State
self.player1_question_index = 0    # Current question (0-19)
self.player1_score = 0             # Correct answers
self.player1_times = []            # Response times
self.player1_responses = []        # All responses

# Player 2 State  
self.player2_question_index = 0
self.player2_score = 0
self.player2_times = []
self.player2_responses = []

# Race State
self.race_finished = False
self.race_winner = None
self.race_start_time = time.time()
```

### 3. Asynchronous Question Processing
```python
async def ask_question_to_player(self, player: int) -> Dict[str, Any]:
    # Get player's current question
    current_question = self.get_player_current_question(player)
    
    # Format prompt and query LLM
    prompt = self._format_question_prompt(current_question)
    model = self.player1 if player == 1 else self.player2
    response, response_time = await self._get_model_response(model, prompt)
    
    # Evaluate correctness and advance player
    is_correct = self._evaluate_answer(response, correct_answer)
    self.advance_player(player, is_correct, response_time)
    
    # Check if race finished
    if self.player_finished(player):
        self.race_finished = True
        self.race_winner = player
```

## 🔌 API Endpoints

### Game Management
- `POST /api/trivia/start` - Initialize new race session
- `GET /api/trivia/game/{game_id}/status` - Get current race status
- `DELETE /api/trivia/game/{game_id}` - Clean up game session

### Race-Specific Endpoints
- `POST /api/trivia/game/{game_id}/player/{player}/next-question` - Process next question for specific player
- `GET /api/trivia/game/{game_id}/player/{player}/current-question` - Get current question for player
- `GET /api/trivia/game/{game_id}/results` - Get final race results

### WebSocket Communication
- `WS /api/trivia/ws/{game_id}` - Real-time race updates

#### WebSocket Message Types
```javascript
// Player completes a question
{
  "type": "player_question_result",
  "data": {
    "player": 1,
    "question_number": 5,
    "response": "Paris", 
    "correct": true,
    "time": 1.23,
    "question": {...}
  }
}

// Race finished
{
  "type": "race_finished", 
  "data": {
    "race_winner": 1,
    "race_time": 45.67,
    "final_scores": {"player1": 18, "player2": 16}
  }
}
```

## 🤖 LLM Integration

### Supported Models
- **OpenAI GPT-4**: Via async OpenAI client
- **Anthropic Claude 3**: Via direct HTTP API calls
- **Google Gemini Pro**: Via async GenerativeAI client  
- **Groq Mixtral**: Via async Groq client

### Unified LLM Interface
```python
class LLMClient:
    def __init__(self, model_type: str):
        self.model_type = model_type.upper()
        self.client = self._initialize_client()
    
    async def query(self, prompt: str) -> str:
        # Model-specific async API calls
        # Returns response text and timing
```

### API Call Optimization
- **Parallel Processing**: Both models query simultaneously
- **Async Operations**: Non-blocking API calls
- **Error Handling**: Graceful degradation on API failures
- **Response Timing**: Precise millisecond timing for race metrics

## 📝 Question Bank System

### Question Format
```python
{
    "id": 1,
    "question": "What is the capital of Australia?",
    "choices": ["Sydney", "Melbourne", "Canberra", "Perth"],
    "correct_answer": "C", 
    "correct_answer_text": "Canberra",
    "category": "Geography"
}
```

### Question Categories
- **Geography**: Countries, capitals, landmarks
- **Science**: Chemistry, physics, biology  
- **Technology**: Programming, companies, protocols
- **History**: World events, dates
- **Literature**: Authors, books, classics
- **Art**: Famous works, artists
- **Music**: Composers, classical pieces
- **Mythology**: Greek mythology, legends

### Answer Evaluation Logic
```python
def _evaluate_answer(self, response: str, correct_answer: str) -> bool:
    # Flexible matching:
    # 1. Exact match
    # 2. Contains correct answer
    # 3. Multiple choice letter matching (A, B, C, D)
    # 4. Case-insensitive comparison
```

## 🎨 Frontend Race Interface

### Split-Screen Layout
```css
.race-split-view {
    display: grid;
    grid-template-columns: 1fr auto 1fr; /* Player1 | VS | Player2 */
    gap: 2rem;
    height: calc(100vh - 200px);
}
```

### Real-Time Components
- **Progress Bars**: Visual progress through 20 questions
- **Question Display**: Current question for each model
- **Response Feed**: Last 3 responses with timing
- **Status Indicators**: "Thinking...", "Finished!", etc.
- **Live Scoring**: Running score count

### WebSocket Integration
```javascript
// Connect to race updates
const ws = new WebSocket(`ws://localhost:8000/api/trivia/ws/${gameId}`)

ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.type === 'player_question_result') {
        updatePlayerProgress(message.data)
        continueRace(message.data.player)
    }
}
```

## ⚙️ Setup & Configuration

### Environment Variables
```bash
# Required API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  
GOOGLE_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key
```

### Installation
```bash
# Install Python dependencies
pip install -r ../requirements.txt

# Copy environment template
cp ../env.example ../.env
# Add your API keys to .env

# Start server
python ../run_trivia.py
```

### Development Server
```bash
# Backend (Port 8000)
python ../run_trivia.py

# Frontend (Port 5173) 
cd ../../versus-frontend
npm run dev
```

## 🏆 Race Metrics & Analytics

### Performance Tracking
- **Response Times**: Millisecond precision per question
- **Accuracy Rates**: Correct/incorrect ratios
- **Race Duration**: Total time from start to finish
- **Question Progression**: Individual question completion times

### Winner Determination
1. **Primary**: First to complete 20 questions
2. **Tiebreaker**: Higher accuracy score
3. **Secondary Tiebreaker**: Faster average response time

### Results Data Structure
```python
{
    "race_finished": True,
    "race_winner": 1,
    "race_time": 45.67,
    "final_scores": {"player1": 18, "player2": 16},
    "questions_completed": {"player1": 20, "player2": 20},
    "average_times": {"player1": 2.1, "player2": 2.3},
    "player1_responses": [...], # Complete response history
    "player2_responses": [...]
}
```

## 🔧 Advanced Features

### Hot Reloading
- **Backend**: Automatic server restart on code changes
- **Frontend**: Live reload with Vite HMR

### Error Handling
- **API Failures**: Graceful degradation with error messages
- **WebSocket Disconnects**: Automatic reconnection
- **Invalid Responses**: Continue race with marked errors

### Scalability Considerations
- **Session Management**: UUID-based game sessions
- **Memory Management**: Automatic cleanup of finished games
- **Concurrent Races**: Multiple races can run simultaneously

## 🎯 Future Enhancements

### Potential Features
- **Custom Question Sets**: Upload your own trivia questions
- **Difficulty Levels**: Easy/Medium/Hard question filtering  
- **Tournament Mode**: Bracket-style competitions
- **Spectator Mode**: Watch races without participating
- **Race Replays**: Review completed races step-by-step
- **Model Performance Analytics**: Historical win/loss ratios

### Technical Improvements
- **Caching Layer**: Redis for session management
- **Database Integration**: Persistent race history
- **Load Balancing**: Multiple server instances
- **Rate Limiting**: API usage protection

---

**Note**: This trivia race format creates an exciting, fast-paced competition that showcases the speed and accuracy differences between different LLM providers in a visually engaging way.
