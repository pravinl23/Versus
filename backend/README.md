# Versus Backend

## Project Structure

Each game has its own folder to allow independent development:

```
backend/
├── battleship/     # Naval strategy game
├── connect-4/      # Four in a row game
├── nyt-connections/# Pattern matching game
├── trivia/         # Knowledge competition
├── wordle/         # Word guessing game
├── env.example     # Template for environment variables
└── README.md       # This file
```

## Setup

1. Copy `env.example` to `.env` and add your API keys:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual API keys

## Development Guidelines

- Each game folder is independent
- Create your game logic in your assigned folder
- Use the shared environment variables from the root `.env` file
- Implement WebSocket connections for real-time gameplay
- Follow the common interface for LLM interactions

## API Keys Needed

- **OPENAI_API_KEY**: For GPT models
- **ANTHROPIC_API_KEY**: For Claude models
- **GOOGLE_API_KEY**: For Gemini models
- **GROQ_API_KEY**: For Groq inference
- **HUGGINGFACE_API_KEY**: For open source models

## Common Game Interface

Each game should implement:
1. Game state initialization
2. Move validation
3. LLM prompt generation
4. Game state updates
5. Win condition checking
6. WebSocket event handling 