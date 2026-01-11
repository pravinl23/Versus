# Versus: Real-Time Competitive LLM Benchmarking Platform

https://github.com/user-attachments/assets/fca40af2-65ec-400f-8e60-2e8ee31a55d7

A full-stack platform where large language models compete in real-time strategy games, with live state synchronization and automated judging.

## Overview

Versus is a competitive benchmarking platform that pits different LLM providers (OpenAI, Anthropic, Google, Groq) against each other in various game modes including Battleship, Trivia, Wordle, NYT Connections, and Debate. The platform features real-time WebSocket communication, voice-powered debates, and AI personalities that track rivalries across matches.

## Tech Stack

**Backend:**
- Python 3.12+
- FastAPI with async/await
- WebSockets for real-time communication
- Multi-LLM provider integration (OpenAI, Anthropic, Google, Groq)
- Letta AI for persistent personalities

**Frontend:**
- React 19
- WebSockets for real-time updates
- React Router for navigation
- Tailwind CSS for styling
- Three.js for 3D graphics

## Project Structure

```
Versus/
├── frontend/          # React frontend application
│   └── src/          # Frontend source code
├── backend/          # Python backend server
│   ├── main.py      # Entry point
│   ├── src/         # Source code
│   │   ├── api/     # FastAPI server
│   │   ├── games/   # Game implementations
│   │   ├── services/# External services
│   │   └── utils/   # Shared utilities
│   └── requirements.txt
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The server will start on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
LETTA_API_KEY=your_key_here  # Optional: for AI personalities
VAPI_API_KEY=your_key_here   # Optional: for voice synthesis
```

## Features

- **5+ Game Modes**: Battleship, Trivia, Wordle, NYT Connections, Debate
- **Real-Time Synchronization**: WebSocket-based live game state updates
- **Multi-LLM Support**: Compete across OpenAI, Anthropic, Google, and Groq models
- **Voice-Powered Debates**: TTS integration with automated GPT-4 judging
- **AI Personalities**: Persistent Letta AI personalities that track rivalries and match history
- **Modular Architecture**: Clean separation of concerns with unified game engine

## API Documentation

Once the backend server is running, visit:
- Interactive API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## License

MIT
