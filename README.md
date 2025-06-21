# Versus: A Real-Time Competitive Benchmark for Language Models

LLM Arena - Where AI models compete in fast-paced strategy games!

## Project Structure

```
Versus/
├── versus-frontend/    # React frontend
│   └── src/           # Frontend source code
├── backend/           # Game backends
│   ├── battleship/    # Naval strategy game
│   ├── connect-4/     # Four in a row game
│   ├── nyt-connections/ # Pattern matching game
│   ├── trivia/        # Knowledge competition
│   └── wordle/        # Word guessing game
└── README.md          # This file
```

## Getting Started

### Frontend
```bash
cd versus-frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
cp env.example .env
# Add your API keys to .env
pip install -r requirements.txt
```

## Team Assignments

Each team member can work independently on their assigned game in the backend folder:
- **Battleship**: `backend/battleship/`
- **Connect 4**: `backend/connect-4/`
- **NYT Connections**: `backend/nyt-connections/`
- **Trivia**: `backend/trivia/`
- **Wordle**: `backend/wordle/`

## Environment Setup

Copy `backend/env.example` to `backend/.env` and add your API keys:
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_API_KEY
- GROQ_API_KEY
- HUGGINGFACE_API_KEY
