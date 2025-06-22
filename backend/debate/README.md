# 🎭 Voice-Powered AI Debate Arena

A sophisticated real-time debate system where LLM agents engage in spoken arguments using advanced voice AI technology.

## 🌟 Overview

The Voice-Powered AI Debate Arena allows two AI models to participate in structured, turn-based debates with full voice integration. Each model receives debate topics, generates persuasive arguments, and delivers them through text-to-speech technology, creating an immersive AI debate experience.

## ✨ Key Features

### 🎤 Voice Integration
- **Text-to-Speech**: Arguments are spoken aloud using Vapi's advanced TTS
- **Voice Differentiation**: Different voices assigned to each debater for clarity
- **Browser TTS Fallback**: Automatic fallback to browser speech synthesis
- **Audio Playback**: Replay any argument with one click

### 🧠 Intelligent Debate Logic
- **Structured Format**: Opening statements, rebuttals, and closing arguments
- **Context-Aware**: Each response considers opponent's previous arguments
- **Multiple LLM Support**: GPT-4, Claude 3 Haiku, Gemini Pro, Groq Mixtral
- **Automatic Judging**: GPT-4 evaluates debates and declares winners

### ⚡ Real-Time Experience
- **WebSocket Communication**: Live updates during debates
- **Auto-Advance Mode**: Watch complete debates unfold automatically
- **Manual Control**: Step through rounds individually if preferred
- **Live Transcript**: Real-time transcript with speaker identification

### 🎯 Professional Interface
- **Split-Screen Layout**: Clear visual separation of debaters
- **Position Assignment**: Random PRO/CON position allocation
- **Round Tracking**: Visual progress through debate rounds
- **Audio Controls**: Individual playback for each statement

## 🏗️ Technical Architecture

### Backend Components
```
backend/debate/
├── debate_game.py      # Core debate logic and LLM integration
├── server.py           # FastAPI server with WebSocket support
└── README.md          # This documentation
```

### Key Classes
- **`VoiceDebateGame`**: Main game controller handling debate flow
- **`DebatePosition`**: Enum for PRO/CON positions  
- **`DebateRoundType`**: Enum for opening/rebuttal/closing rounds
- **`ConnectionManager`**: WebSocket connection management

### APIs and Integrations
- **FastAPI**: RESTful API endpoints and WebSocket server
- **Vapi**: Primary voice synthesis and speech processing
- **LLM APIs**: OpenAI, Anthropic, Google, Groq integrations
- **WebSocket**: Real-time bidirectional communication

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Python 3.12+ required
python --version

# Install dependencies
cd backend
pip install -r requirements.txt
```

### 2. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your API keys
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
VAPI_API_KEY=your_vapi_key_here
# ... other keys
```

### 3. Start the Server
```bash
# From backend directory
python run_debate.py

# Server starts on http://localhost:8003
```

### 4. Frontend Integration
The React frontend automatically connects to the backend when you select "Debate" from the main games menu.

## 📚 API Reference

### Start Debate
```http
POST /api/debate/start
Content-Type: application/json

{
  "player1_model": "OPENAI",
  "player2_model": "ANTHROPIC", 
  "topic": "AI should be regulated by government",
  "total_rounds": 6
}
```

**Response:**
```json
{
  "debate_id": "uuid-string",
  "initial_state": {
    "topic": "AI should be regulated by government",
    "player1_position": "PRO",
    "player2_position": "CON",
    "current_speaker": 1,
    "total_rounds": 6
  }
}
```

### Advance Round
```http
POST /api/debate/{debate_id}/next-round
```

### Auto-Advance Debate
```http
POST /api/debate/{debate_id}/auto-advance
```

### Get Debate State
```http
GET /api/debate/{debate_id}/state
```

### WebSocket Connection
```
ws://localhost:8003/api/debate/ws/{debate_id}
```

**Message Types:**
- `connected`: Connection established
- `current_state`: Initial debate state
- `round_completed`: New round finished
- `debate_finished`: Debate concluded with judgment

## 🎮 Game Flow

### 1. Setup Phase
- User selects two different LLM models
- Chooses or enters debate topic
- Sets total rounds (4, 6, 8, or 10)
- System randomly assigns PRO/CON positions

### 2. Debate Rounds
Each round follows this pattern:
1. **Generate Argument**: Current speaker's LLM generates response
2. **Voice Synthesis**: Text converted to speech via Vapi
3. **Audio Playback**: Argument spoken aloud
4. **Transcript Update**: Real-time transcript updated
5. **Speaker Switch**: Alternate to other model

### 3. Round Types
- **Opening (Rounds 1-2)**: Initial position statements
- **Rebuttal (Middle rounds)**: Counter-arguments and rebuttals
- **Closing (Final rounds)**: Summarizing arguments

### 4. Judgment Phase
- GPT-4 analyzes complete transcript
- Evaluates logical consistency, rebuttals, persuasion
- Declares winner with detailed reasoning

## 🔧 Configuration Options

### Supported Models
| Provider | Model | Icon | Voice |
|----------|-------|------|-------|
| OpenAI | GPT-4 | 🤖 | Male |
| Anthropic | Claude 3 Haiku | 🧠 | Female |
| Google | Gemini Pro | 💎 | Male |
| Groq | Mixtral 8x7B | ⚡ | Female |

### Voice Settings
- **Player 1**: `en-US-Studio-O` (Male voice)
- **Player 2**: `en-US-Studio-M` (Female voice)
- **Fallback**: Browser's built-in speech synthesis
- **Rate**: 0.9x normal speed for clarity

### Debate Parameters
- **Total Rounds**: 4-10 rounds (each model speaks equally)
- **Response Length**: Maximum 80 words per argument
- **Temperature**: 0.7 for creative but focused responses
- **Context**: Previous opponent arguments included in prompts

## 🔬 Advanced Features

### Vapi Integration Details
```python
# Vapi TTS Configuration
{
  "assistant": {
    "model": {"provider": "openai", "model": "gpt-3.5-turbo"},
    "voice": {"provider": "11labs", "voiceId": "voice_id"}
  }
}
```

### WebSocket Message Format
```json
{
  "type": "round_completed",
  "debate_id": "uuid",
  "round_data": {
    "round": 1,
    "speaker": 1,
    "position": "PRO",
    "round_type": "opening",
    "text": "Argument text here...",
    "audio_url": "https://...",
    "timestamp": 1699123456.789
  }
}
```

### Judgment Criteria
The AI judge evaluates based on:
1. **Logical Consistency**: Internal coherence of arguments
2. **Effective Rebuttals**: Direct responses to opponent points
3. **Persuasive Power**: Compelling and clear presentation
4. **Overall Performance**: Comprehensive debate effectiveness

## 🛠️ Development

### Adding New LLM Models
1. Update `LLMClient` in `common.py`
2. Add model handling in `debate_game.py`
3. Update frontend model selection
4. Add API key to environment template

### Customizing Voice Settings
```python
# In debate_game.py
self.player1_voice = "custom-voice-id"
self.player2_voice = "another-voice-id"
```

### Extending Debate Formats
```python
class CustomDebateRoundType(Enum):
    CROSS_EXAMINATION = "cross_examination"
    FINAL_STATEMENT = "final_statement"
```

## 🐛 Troubleshooting

### Common Issues

**Connection Failed**
- Check if backend server is running on port 8003
- Verify WebSocket connection in browser console
- Ensure CORS settings allow frontend domain

**Voice Playback Issues**
- Verify VAPI_API_KEY is set correctly
- Check browser's audio permissions
- Test with browser TTS fallback

**LLM API Errors**
- Confirm API keys are valid and have sufficient credits
- Check rate limits for your API provider
- Verify model names match provider specifications

### Debug Mode
```bash
# Start server with detailed logging
PYTHONPATH=. uvicorn debate.server:app --host 0.0.0.0 --port 8003 --reload --log-level debug
```

## 📈 Performance Considerations

- **Concurrent Debates**: Server supports multiple simultaneous debates
- **Memory Usage**: Each debate stores full transcript in memory
- **API Rate Limits**: Respects provider rate limits with error handling
- **WebSocket Limits**: Automatically cleans up broken connections

## 📝 License

This project is part of the VERSUS platform - an AI benchmarking and competition system.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🔮 Future Enhancements

- **Multi-Round Formats**: Tournament-style debates
- **Audience Voting**: Public voting on debate winners
- **Video Integration**: Visual avatars for debaters
- **Custom Topics**: User-generated debate topics with categories
- **Analytics Dashboard**: Detailed performance metrics and statistics

---

Built with ❤️ for the Cal Hacks hackathon, featuring Vapi voice AI integration. 