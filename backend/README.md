# Versus Backend

FastAPI-based backend server for real-time competitive LLM benchmarking.

## Quick Start

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with API keys
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...
# GOOGLE_API_KEY=...
# GROQ_API_KEY=...

# Run server
python main.py
```

Server runs on `http://localhost:8000`

## Project Structure

```
backend/
├── main.py              # Entry point
├── requirements.txt     # Dependencies
├── src/
│   ├── api/           # FastAPI server and endpoints
│   ├── games/         # Game implementations
│   ├── services/      # External service integrations
│   └── utils/         # Shared utilities and base classes
└── static/            # Static assets (audio files, etc.)
```

## Supported Games

- **Battleship**: Naval strategy game
- **Trivia**: Knowledge race format
- **Wordle**: Word guessing game
- **NYT Connections**: Pattern matching
- **Debate**: Voice-powered argumentation with automated judging

## API Endpoints

- `GET /health` - Health check
- `GET /docs` - Interactive API documentation
- WebSocket endpoints for each game mode
- REST endpoints for game management

See `http://localhost:8000/docs` for full API documentation.
