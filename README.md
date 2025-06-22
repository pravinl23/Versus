# 🥊 VERSUS: Real-Time Competitive Benchmark for Language Models

<div align="center">
  
  **"Like UFC for LLMs"** - Where AI models battle in real-time strategy games
  
  [![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![WebSocket](https://img.shields.io/badge/WebSocket-Enabled-cyan)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
  [![LLMs](https://img.shields.io/badge/LLMs-10%2B%20Models-purple)](https://github.com/openai/openai-python)
  
</div>

## 🎮 Project Overview

VERSUS is an innovative platform that benchmarks Large Language Models (LLMs) through real-time competitive gameplay. Instead of traditional static benchmarks, we pit AI models against each other in strategy games that test different cognitive capabilities - from tactical thinking in Battleship to linguistic reasoning in Wordle.

### 🌟 Key Features

- **Multi-Model Support**: 10+ LLM models across 4 providers (OpenAI, Anthropic, Google, Groq)
- **5 Competitive Games**: Each testing different AI capabilities
- **Real-Time Gameplay**: WebSocket-powered live competitions with <100ms latency
- **AI Personalities**: Persistent personalities that evolve and remember rivalries
- **Audience Participation**: Live voting system with QR codes for spectators
- **Post-Game Roasts**: AI-generated trash talk with voice synthesis
- **Beautiful UI**: Smash Bros-inspired model selection, Three.js effects

## 🏗️ Architecture

### System Overview
```
Frontend (React + Vite) ←→ Backend (FastAPI) ←→ LLM APIs
                       ↓                    ↓
                   WebSocket            Letta Service
                       ↓                    ↓
                 Live Updates          Voice Synthesis
```

### Tech Stack

**Frontend:**
- React 18 with Vite for blazing-fast development
- Three.js for stunning visual effects
- WebSocket connections for real-time updates
- Tailwind CSS for responsive design
- VT323 font for retro gaming aesthetic

**Backend:**
- FastAPI for high-performance async operations
- WebSocket support for live gameplay
- Unified game engine architecture
- In-memory game state management
- CORS-enabled for network play

**AI Integration:**
- OpenAI API (GPT-4o, GPT-4o-mini)
- Anthropic API (Claude-3-haiku, Claude-3.5-sonnet)
- Google Gemini API (Gemini-1.5-pro, Gemini-1.5-flash)
- Groq API (Llama-3, Mixtral)
- Letta (formerly MemGPT) for personality management
- ElevenLabs & OpenAI TTS for voice synthesis

## 🎯 Game Modes

### 1. 🚢 Battleship - Strategic Warfare
- **Tests**: Spatial reasoning, strategy, pattern recognition
- **Implementation**: 8x8 grid, smart targeting AI, ship placement algorithms
- **Real-time**: Move-by-move updates via WebSocket

### 2. 🧠 Trivia Race - Knowledge Sprint
- **Tests**: General knowledge, response speed, accuracy
- **Implementation**: 20-question race, parallel processing, live progress tracking
- **Unique**: Both models race simultaneously, not turn-based

### 3. 📝 Wordle Battle - Linguistic Reasoning
- **Tests**: Language understanding, deductive reasoning, vocabulary
- **Implementation**: Strategic word selection, feedback analysis, pattern matching
- **Visualization**: Real-time reasoning display showing AI thought process

### 4. 🔗 NYT Connections - Pattern Recognition
- **Tests**: Categorization, lateral thinking, pattern identification
- **Implementation**: Real puzzle data, grouping algorithms, mistake tracking
- **Challenge**: Models must identify hidden connections between words

### 5. 🎭 Debate Arena - Argument Generation
- **Tests**: Reasoning, rhetoric, real-time response generation
- **Implementation**: Topic-based debates, GPT-4o judge, argument streaming
- **Features**: Split-screen transcripts, voice synthesis for arguments

## 🔧 Technical Implementation

### Unified Game Engine
```python
# Base game class for all games
class BaseGame:
    def __init__(self, player1_model: str, player2_model: str):
        self.player1 = LLMClient(player1_model)
        self.player2 = LLMClient(player2_model)
        self.game_state = self.initialize_game()
    
    @abstractmethod
    def make_move(self, move: str) -> bool:
        """Implement game-specific logic"""
        pass
```

### LLM Integration Layer
```python
class LLMClient:
    def __init__(self, model_id: str):
        self.model_type, self.model_name = self._parse_model_id(model_id)
        self.client = self._initialize_client()
    
    def get_response(self, prompt: str) -> str:
        """Unified interface for all LLM providers"""
        # Provider-specific implementation
        pass
```

### Real-Time Communication
```javascript
// WebSocket connection for live updates
const ws = new WebSocket(`ws://localhost:8000/games/${gameType}/${gameId}`)

ws.onmessage = (event) => {
  const update = JSON.parse(event.data)
  updateGameState(update)
  playMoveAnimation(update)
}
```

### AI Personality System (Letta Integration)
```python
# Persistent AI personalities with memory
personalities = {
    "gpt-4o-mini": {
        "name": "Lightning",
        "persona": "Speed demon, quick thinker, cocky but skilled"
    },
    "claude-3-haiku": {
        "name": "The Strategist",
        "persona": "Methodical, calculating, patient victor"
    }
}

# Post-game roast generation
async def generate_roast(winner, loser, game_data):
    prompt = f"You just crushed {loser} in {game_type}. Roast them!"
    roast = await letta_agent.generate(prompt)
    audio = await synthesize_voice(roast, voice_style="savage")
    return audio_url
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- API keys for LLM providers

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/versus.git
cd versus
```

2. **Set up the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with your API keys
cp env.example .env
# Edit .env and add your keys:
# OPENAI_API_KEY=your-key
# ANTHROPIC_API_KEY=your-key
# GOOGLE_API_KEY=your-key
# GROQ_API_KEY=your-key
# ELEVENLABS_API_KEY=your-key (optional)
# LETTA_API_KEY=your-key (optional)
```

3. **Set up the frontend**
```bash
cd ../versus-frontend
npm install
```

4. **Start the servers**

Backend (Terminal 1):
```bash
cd backend
python main.py
```

Frontend (Terminal 2):
```bash
cd versus-frontend
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🎯 How It Works

1. **Model Selection**: Players choose their AI champions from 10+ available models
2. **Game Selection**: Pick from 5 different game modes testing various capabilities
3. **Live Competition**: Watch as AIs battle in real-time with move-by-move updates
4. **Audience Voting**: Spectators can vote for their predicted winner via QR code
5. **Results & Roasting**: Winner generates a savage AI roast with voice synthesis

## 🏆 Why This Matters

Traditional LLM benchmarks are static and disconnected from real-world applications. VERSUS provides:

- **Dynamic Evaluation**: Real-time performance under competitive pressure
- **Multi-Dimensional Testing**: Different games test different capabilities
- **Entertainment Value**: Makes AI evaluation engaging and accessible
- **Practical Insights**: Reveals model strengths/weaknesses in interactive scenarios
- **Scalable Framework**: Easy to add new games and models

## 👥 Team & Development

Built during a hackathon with a focus on:
- **Modular Architecture**: Each team member could work on different games independently
- **Unified Backend**: Single server handles all games with shared infrastructure
- **Real-Time First**: WebSocket integration from the ground up
- **AI Personality**: Novel use of Letta for persistent AI characters

## 📊 Performance & Scalability

- **Latency**: <100ms response time for most operations
- **Concurrent Games**: Supports multiple simultaneous matches
- **State Management**: Efficient in-memory game state with session isolation
- **Error Handling**: Graceful fallbacks for API failures
- **Audio Caching**: Generated roasts stored for instant playback

## 🔮 Future Enhancements

- Tournament mode with brackets
- Spectator chat and reactions
- Model fine-tuning based on game performance
- Additional games (Chess, Go, Poker)
- Mobile app for voting
- Leaderboards and ELO ratings

## 📝 License

MIT License - feel free to fork and extend!

## 🙏 Acknowledgments

- LLM providers for API access
- Letta team for personality framework
- ElevenLabs for voice synthesis
- The competitive AI community for inspiration

---

<div align="center">
  
  **Built with ❤️ for the future of AI benchmarking**
  
  [Live Demo](https://versus-ai.demo) | [Documentation](https://docs.versus-ai.dev) | [Discord](https://discord.gg/versus-ai)
  
</div> 