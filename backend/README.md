# VERSUS Backend - Unified Game Server

A clean, modular backend server for VERSUS - a real-time competitive benchmark for Language Models.

## 🎮 Supported Games

1. **Battleship** - Naval strategy game testing spatial reasoning
2. **Trivia** - Knowledge and reasoning test  
3. **Wordle** - Word guessing game testing language understanding
4. **NYT Connections** (Coming Soon) - Pattern recognition
5. **Connect 4** (Coming Soon) - Strategic planning

## 🚀 Quick Start

### 1. Setup Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure API Keys
```bash
cp config/env.example .env
# Edit .env and add your API keys
```

### 4. Run the Server
```bash
python main.py
```

The server will start on `http://localhost:8000`

## 📁 Clean Project Structure

```
backend/
├── main.py                 # Main entry point
├── requirements.txt        # Python dependencies
├── .env                    # Your API keys (create from config/env.example)
│
├── config/                 # Configuration files
│   └── env.example        # Environment template
│
├── src/                    # Source code
│   ├── api/               # API and server
│   │   └── server.py      # Unified FastAPI server
│   │
│   ├── games/             # Game implementations
│   │   ├── battleship/    # Battleship game
│   │   ├── trivia/        # Trivia game
│   │   ├── wordle/        # Wordle game
│   │   ├── nyt-connections/ # Coming soon
│   │   └── connect-4/     # Coming soon
│   │
│   └── utils/             # Shared utilities
│       └── common.py      # Base classes and LLM clients
│
└── venv/                  # Virtual environment (gitignored)
```

## 🔌 API Endpoints

### Health & Info
- `GET /` - Server info and active games
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

### Battleship
- `WebSocket /games/battleship/{game_id}` - Real-time game connection

### Trivia
- `POST /api/trivia/start` - Start new game
- `WebSocket /api/trivia/ws/{game_id}` - Real-time updates
- `POST /api/trivia/game/{game_id}/player/{player}/next-question` - Get next question
- `GET /api/trivia/game/{game_id}/player/{player}/current-question` - Get current question

### Wordle
- `POST /api/wordle/start` - Start new game
- `GET /api/wordle/state` - Get game state (backward compatible)
- `GET /api/wordle/state/{game_id}` - Get game state by ID
- `POST /api/wordle/guess` - Make a guess (backward compatible)
- `POST /api/wordle/guess/{game_id}` - Make a guess by ID

## 🧪 Testing

### Quick Test
```bash
# Check server health
curl http://localhost:8000/health

# View API documentation
open http://localhost:8000/docs
```

### Run Tests
```bash
pytest tests/  # Coming soon
```

## 🛠️ Development

### Adding a New Game

1. Create a new folder under `src/games/your-game/`
2. Implement game logic following the `BaseGame` interface from `src/utils/common.py`
3. Add API endpoints in `src/api/server.py`
4. Update the frontend to support the new game

### Code Style
```bash
# Format code
black src/

# Check linting
flake8 src/
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

### Import Errors
Make sure you're running from the `backend/` directory and have activated the virtual environment.

### Missing API Keys
Check that your `.env` file exists and contains all required API keys.

## 📝 License

This project is part of the VERSUS hackathon project. 