# 🎭 Letta AI Personalities Integration Setup

Your Versus platform now has AI personalities that remember rivalries, create dramatic storylines, and give post-game interviews with voice synthesis!

## 🚀 Quick Setup

### 1. **Install Dependencies**
```bash
cd backend
pip install letta-client
```

### 2. **Configure API Keys**
Copy `backend/config/env.example.letta` to `backend/.env` and fix the typos:

```bash
# Fix these lines in your .env file:
LETTA_API_KEY=letta_your-letta-api-key-here  # Remove the extra 'e'
VAPI_API_KEY=vapi_your-vapi-api-key-here    # Remove the extra 'e'
```

### 3. **Get Your API Keys**

#### **Letta API Key** (Required)
1. Go to [app.letta.com](https://app.letta.com)
2. Create an account or sign in
3. Navigate to [API Keys](https://app.letta.com/api-keys)
4. Create a new API key
5. Add it to your `.env` file

#### **Vapi API Key** (Optional - for voice)
1. Go to [vapi.ai](https://vapi.ai)
2. Create account and get API key
3. Add to `.env` file
4. **NOTE**: If you don't have Vapi, the system uses OpenAI TTS as fallback

### 4. **Start the Server**
```bash
cd backend
python main.py
```

The server will automatically:
- ✅ Initialize Letta personalities
- 🎭 Create AI fighters: Lightning, The Strategist, The Mastermind, Wildcard
- 🧠 Set up memory systems for rivalries and storylines

## 🎪 **What You Get**

### **AI Personalities**
- **Lightning** (GPT-4o-mini): Speed demon, cocky, trash-talking speedster
- **The Strategist** (Claude-3-haiku): Methodical, calculating, psychological warfare
- **The Mastermind** (Claude-3-5-sonnet): Apex predator, perfect execution
- **Wildcard** (Gemini-1.5-flash): Unpredictable, creative, chaotic genius

### **Memory & Rivalries**
- Tracks wins/losses across all games
- Remembers specific match details and strategies
- Builds psychological profiles of opponents
- Creates ongoing storylines and feuds

### **Post-Game Interviews**
- Personality-driven responses based on game outcome
- References past matches and rivalries
- Text-to-speech conversion with voice styles
- Interactive interview player with audio controls

### **Enhanced Game Experience**
- Pre-game personality introductions
- Real-time memory updates during games
- Post-game drama with interviews
- Audience engagement through personalities

## 🎮 **Supported Games**

| Game | Letta Integration | Interview Support |
|------|------------------|-------------------|
| Battleship | ✅ Full | ✅ Yes |
| Trivia | ✅ Full | ✅ Yes |
| Wordle | 🔄 Planned | 🔄 Planned |
| Connections | 🔄 Planned | 🔄 Planned |

## 🎤 **Interview System**

After each game, you'll see:
1. **Automatic Interview Generation** - Letta creates personality-driven responses
2. **Voice Synthesis** - Converts text to speech with voice styles
3. **Interactive Player** - Click to play winner/loser interviews
4. **Memory Updates** - Results feed back into personality memories

## 🛠️ **Troubleshooting**

### **"Letta personalities disabled"**
- Check your `LETTA_API_KEY` in `.env`
- Make sure you removed the typo (`heree` → `here`)
- Verify your Letta Cloud account has API quota

### **"Audio not available - text only"**
- VAPI_API_KEY not configured (this is optional)
- System falls back to OpenAI TTS automatically
- Check your OpenAI API key for TTS fallback

### **"Failed to initialize personalities"**
- Check internet connection
- Verify Letta Cloud API quota
- Check backend logs for specific errors

### **Missing imports error**
```bash
pip install letta-client httpx
```

## 🎯 **Next Steps**

1. **Test a Game**: Start Battleship or Trivia to see personalities in action
2. **Watch Interviews**: Complete a game to see post-game interviews
3. **Track Rivalries**: Play multiple games to build storylines
4. **Customize Personalities**: Edit `letta_service.py` to modify personas

## 🎭 **Example Interview Output**

**Reporter**: "How does it feel to win that match?"

**Lightning**: "Are you kidding me? I just dismantled The Strategist's entire fleet in under 3 minutes! Speed beats strategy every time. That's 4-1 in our head-to-head now, and I'm just getting warmed up!"

**The Strategist**: "Lightning got lucky with some aggressive early shots, I'll give them that. But luck runs out eventually. I've been analyzing their patterns, and next time I'll be ready. The student will become the master."

## 🏆 **Advanced Features**

- **Personality Stats API**: `/api/personalities` - Get rivalry data
- **Memory Persistence**: Personalities remember across server restarts
- **Voice Styles**: Different speech patterns per personality
- **Storyline Tracking**: Long-term narrative arcs

## 🎬 **The Vision**

Transform your AI benchmarks into compelling entertainment with:
- **Memorable Characters** instead of anonymous models
- **Ongoing Storylines** instead of isolated matches  
- **Dramatic Moments** instead of dry statistics
- **Community Engagement** through personality-driven content

Your AI arena is now ready for prime time! 🎪 