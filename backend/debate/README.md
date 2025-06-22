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
- **Structured Rounds**: Opening statements, rebuttals, and closing arguments
- **Position Assignment**: Random PRO/CON assignment for fair debates
- **Context Awareness**: Models reference previous arguments and counter-points
- **Smart Prompting**: Specialized prompts for different debate phases

### ⚖️ Automated Judging
- **GPT-4 Judge**: Impartial evaluation of argument quality
- **Reasoning Analysis**: Detailed explanation of judging decisions
- **Multiple Criteria**: Logic, evidence, persuasiveness, and strategy

### 🔄 Real-Time Interface
- **WebSocket Updates**: Live debate progression and state changes
- **Beautiful UI**: Modern React interface with Tailwind CSS styling
- **Progress Tracking**: Visual indicators for debate advancement
- **Interactive Controls**: Manual or automatic debate progression

## 🛠️ Technical Architecture

### Backend Stack
- **FastAPI**: High-performance async web framework
- **WebSockets**: Real-time bidirectional communication
- **Vapi Integration**: Professional voice synthesis API
- **Multi-LLM Support**: OpenAI, Anthropic, Google, Groq

### Frontend Stack
- **React 18**: Modern component-based UI framework
- **Tailwind CSS**: Utility-first styling with gradients and animations
- **WebSocket Client**: Real-time updates and interaction
- **Browser Audio**: Fallback TTS and audio playback

### Voice Technology
- **Vapi TTS**: High-quality neural voice synthesis
- **Voice Profiles**: Distinct voices for each debater
- **Audio Streaming**: Efficient audio delivery and playback
- **Cross-Platform**: Works on all modern browsers

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Environment
```bash
cp env.example .env
# Edit .env with your API keys
```

Required API keys:
- `VAPI_API_KEY`: Get from [Vapi Dashboard](https://dashboard.vapi.ai/)
- `OPENAI_API_KEY`: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `ANTHROPIC_API_KEY`: Get from [Anthropic Console](https://console.anthropic.com/)

### 3. Start the Server
```bash
cd backend/debate
python run_debate.py
```

### 4. Start the Frontend
```bash
cd versus-frontend
npm install
npm run dev
```

### 5. Open the App
Navigate to `http://localhost:5173` and click on "Debate" to begin!

## 🎮 How to Use

### Starting a Debate
1. **Choose Topic**: Select from predefined topics or enter your own
2. **Select Models**: Pick two different AI models to debate
3. **Set Rounds**: Choose debate length (4-10 rounds)
4. **Start Debate**: Launch the voice-powered debate arena

### During the Debate
- **Next Argument**: Generate the next argument manually
- **Auto Advance**: Let the system run the entire debate automatically
- **Replay Audio**: Click on any argument to hear it again
- **Real-Time Updates**: Watch the debate unfold in real-time

### After the Debate
- **Automatic Judging**: GPT-4 evaluates the entire debate
- **Winner Declaration**: Clear indication of the winning side
- **Reasoning**: Detailed explanation of the judging decision

## 📡 API Endpoints

### Debate Management
```http
POST /api/debate/start
GET /api/debate/{debate_id}/state
POST /api/debate/{debate_id}/argument
POST /api/debate/{debate_id}/advance
POST /api/debate/{debate_id}/judge
DELETE /api/debate/{debate_id}
```

### Voice Synthesis
```http
POST /api/debate/{debate_id}/tts
```

### Real-Time Updates
```http
WebSocket: /api/debate/ws/{debate_id}
```

## 🗣️ Voice Synthesis

### Vapi Integration
The system uses Vapi's advanced neural TTS for high-quality voice synthesis:

```python
async def synthesize_speech(self, text: str, player: str) -> Optional[str]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.vapi.ai/tts/synthesize",
            headers={"Authorization": f"Bearer {vapi_key}"},
            json={
                "text": text,
                "voice": voice_settings["voice_id"],
                "speed": voice_settings["speed"],
                "format": "mp3"
            }
        )
        return response.json().get("audio_url")
```

### Fallback System
If Vapi is unavailable, the system automatically falls back to browser TTS:

```javascript
const speakText = (text, player) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = player === 'player1' ? maleVoice : femaleVoice;
    speechSynthesis.speak(utterance);
};
```

## 🤖 Supported Models

| Provider | Model | Voice Quality | Debate Style |
|----------|-------|---------------|--------------|
| OpenAI | GPT-4 | ⭐⭐⭐⭐⭐ | Analytical, structured |
| Anthropic | Claude 3 | ⭐⭐⭐⭐⭐ | Thoughtful, nuanced |
| Google | Gemini Pro | ⭐⭐⭐⭐ | Creative, diverse |
| Groq | Mixtral | ⭐⭐⭐⭐ | Fast, direct |

## 🎯 Example Debate Topics

### Technology & Society
- "AI should be regulated by government"
- "Social media does more harm than good"
- "Cryptocurrency will replace traditional currency"

### Environment & Energy
- "Nuclear energy is the future of clean power"
- "Renewable energy can replace fossil fuels completely"

### Work & Economics
- "Remote work is better than office work"
- "Universal basic income should be implemented"

### Ethics & Philosophy
- "Human genetic modification should be allowed"
- "Privacy is more important than security"

## 🔧 Configuration

### Voice Settings
Customize voice characteristics in `debate_game.py`:
```python
self.voice_settings = {
    "player1": {"voice_id": "jennifer", "speed": 1.0},
    "player2": {"voice_id": "mark", "speed": 1.0}
}
```

### Debate Parameters
Adjust debate structure:
```python
class VoiceDebateGame:
    def __init__(self, total_rounds=6):
        self.total_rounds = total_rounds  # 4-10 recommended
        self.round_types = self._setup_round_types()
```

### Prompt Templates
Customize argument generation in `_create_debate_prompt()`:
- Opening statements
- Rebuttal arguments  
- Closing statements

## 🐛 Troubleshooting

### Common Issues

**Voice not playing**
- Check Vapi API key in `.env`
- Verify browser audio permissions
- Try manual audio replay

**Models not responding**
- Confirm LLM API keys are valid
- Check internet connectivity
- Review server logs for errors

**WebSocket disconnections**
- Refresh the browser page
- Check server is running on port 8003
- Verify firewall settings

### Debug Mode
Enable detailed logging:
```bash
export DEBUG=1
python run_debate.py
```

## 🔮 Future Enhancements

### Planned Features
- **Multi-language Support**: Debates in different languages
- **Audience Voting**: Real-time audience participation
- **Video Integration**: Avatar-based visual debates
- **Debate Tournaments**: Bracket-style competitions
- **Custom Voice Training**: Personalized AI voices

### Advanced Capabilities
- **Emotion Analysis**: Detect debate emotion and intensity
- **Fact Checking**: Real-time verification of claims
- **Debate Coaching**: AI-powered improvement suggestions
- **Live Streaming**: Broadcast debates to audiences

## 📄 License

This project is part of the VERSUS AI benchmarking platform.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Voice synthesis quality
- Debate prompt engineering
- UI/UX enhancements
- Additional LLM integrations

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for errors
3. Ensure all API keys are configured
4. Test with simple debate topics first

---

**Built with ❤️ for the Cal Hacks hackathon - showcasing the future of AI-powered debate and voice technology!** 