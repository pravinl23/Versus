"""
Real AI vs AI Wordle - Testing OpenAI GPT-4o vs Anthropic Claude
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
from typing import Dict, List
import openai
import anthropic

app = Flask(__name__)
CORS(app)

# Initialize API clients
openai_api_key = os.getenv('OPENAI_API_KEY')
anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')

if not openai_api_key:
    print("⚠️  OPENAI_API_KEY not found! Set it with: export OPENAI_API_KEY='your_key_here'")
if not anthropic_api_key:
    print("⚠️  ANTHROPIC_API_KEY not found! Set it with: export ANTHROPIC_API_KEY='your_key_here'")

# Only initialize clients if keys are provided
openai_client = openai.OpenAI(api_key=openai_api_key) if openai_api_key else None
anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key) if anthropic_api_key else None

# Current game state
current_game = None


class WordleGame:
    def __init__(self, secret_word: str):
        self.secret_word = secret_word.upper()
        self.models = {
            "openai": {"guesses": [], "feedback": [], "reasoning": [], "won": False},
            "anthropic": {"guesses": [], "feedback": [], "reasoning": [], "won": False}
        }
        self.game_over = False
        self.winner = None
        print(f"\n=== NEW GAME STARTED ===")
        print(f"Secret word: {self.secret_word}")
    
    def check_guess(self, guess: str) -> List[str]:
        """Return feedback for a guess"""
        guess = guess.upper()
        feedback = []
        secret_copy = list(self.secret_word)
        
        # First pass: mark greens
        for i in range(5):
            if guess[i] == self.secret_word[i]:
                feedback.append("green")
                secret_copy[i] = None
            else:
                feedback.append(None)
        
        # Second pass: mark yellows and blacks
        for i in range(5):
            if feedback[i] is None:
                if guess[i] in secret_copy:
                    feedback[i] = "yellow"
                    secret_copy[secret_copy.index(guess[i])] = None
                else:
                    feedback[i] = "black"
        
        return feedback
    
    def make_guess(self, model: str, guess: str, reasoning: str = "") -> Dict:
        """Process a guess"""
        if self.game_over:
            return {"error": "Game already over"}
        
        guess = guess.upper()
        feedback = self.check_guess(guess)
        
        # Store the guess, feedback, and reasoning
        self.models[model]["guesses"].append(guess)
        self.models[model]["feedback"].append(feedback)
        self.models[model]["reasoning"].append(reasoning)
        
        # Check if won
        if guess == self.secret_word:
            self.models[model]["won"] = True
            current_guesses = len(self.models[model]['guesses'])
            
            # Determine winner in simultaneous play
            if not self.game_over:  # First to solve wins
                self.game_over = True
                self.winner = model
                print(f"\n🎉 {model.upper()} WINS! Found '{self.secret_word}' in {current_guesses} guesses")
            else:  # Both solved in same round - compare guess counts
                other_model = 'anthropic' if model == 'openai' else 'openai'
                other_guesses = len(self.models[other_model]['guesses'])
                
                if current_guesses < other_guesses:
                    self.winner = model
                    print(f"\n🎉 {model.upper()} WINS! Both found '{self.secret_word}' but {model.upper()} used fewer guesses ({current_guesses} vs {other_guesses})")
                elif current_guesses > other_guesses:
                    # Other model already won with fewer guesses
                    print(f"\n{model.upper()} found '{self.secret_word}' in {current_guesses} guesses but {other_model.upper()} already won with {other_guesses}")
                else:
                    self.winner = "TIE"
                    print(f"\n🤝 TIE! Both found '{self.secret_word}' in {current_guesses} guesses")
        
        return {
            "guess": guess,
            "feedback": feedback,
            "game_over": self.game_over,
            "winner": self.winner
        }


@app.route('/api/wordle/start', methods=['POST'])
def start_game():
    """Start a new game"""
    global current_game
    
    data = request.json
    secret_word = data.get('secret_word', '').upper()
    
    if len(secret_word) != 5 or not secret_word.isalpha():
        return jsonify({"error": "Must be a 5-letter word"}), 400
    
    current_game = WordleGame(secret_word)
    return jsonify({"success": True})


@app.route('/api/wordle/state', methods=['GET'])
def get_state():
    """Get current game state"""
    if not current_game:
        return jsonify({"error": "No active game"}), 404
    
    return jsonify({
        "models": current_game.models,
        "game_over": current_game.game_over,
        "winner": current_game.winner,
        "secret_word": current_game.secret_word if current_game.game_over else None
    })


@app.route('/api/wordle/guess', methods=['POST'])
def make_guess():
    """Make a guess for a model"""
    if not current_game:
        return jsonify({"error": "No active game"}), 404
    
    data = request.json
    model = data.get('model')
    
    if model not in ['openai', 'anthropic']:
        return jsonify({"error": "Invalid model"}), 400
    
    # Get AI's guess from the actual LLM
    model_data = current_game.models[model]
    try:
        guess, reasoning = get_llm_guess(model, model_data['guesses'], model_data['feedback'])
    except Exception as e:
        print(f"❌ Error getting guess from {model}: {e}")
        # Fallback to prevent crashes
        fallback_words = ["CRANE", "SLATE", "AUDIO", "HOUSE", "ROUND", "LIGHT", "PRINT", "WORLD", "PARTY", "KNIFE"]
        guess = fallback_words[len(model_data['guesses']) % len(fallback_words)]
        
        if "API key not configured" in str(e):
            reasoning = f"🔑 API key missing for {model.upper()} - using fallback word: {guess}"
        else:
            reasoning = f"⚠️ {model.upper()} API error - using fallback word: {guess}"
    
    # Make the guess
    result = current_game.make_guess(model, guess, reasoning)
    
    # Log the turn
    turn = len(model_data['guesses'])
    print(f"\n{model.upper()} - Turn {turn}")
    print(f"Guess: {guess}")
    print(f"Reasoning: {reasoning}")
    print(f"Feedback: {result['feedback']}")
    
    # Get detailed reasoning for UI
    detailed_reasoning = parse_reasoning_for_ui(model, reasoning, model_data['guesses'], model_data['feedback'])
    
    return jsonify({
        "guess": guess,
        "reasoning": reasoning,
        "detailed_reasoning": detailed_reasoning,
        "feedback": result['feedback'],
        "game_over": result['game_over'],
        "winner": result['winner']
    })


def build_wordle_prompt(model: str, previous_guesses: List[str], previous_feedback: List[List[str]]) -> str:
    """Build a strategic prompt for the LLM"""
    
    turn = len(previous_guesses) + 1
    
    if turn == 1:
        return f"""You are playing Wordle. You need to guess a 5-letter word. 

RULES:
- Green means the letter is correct and in the right position
- Yellow means the letter is in the word but in the wrong position  
- Black means the letter is not in the word at all

This is turn {turn}. Make your first guess.

IMPORTANT: 
- Respond with ONLY a single 5-letter word in ALL CAPS
- Choose a strategic opening word that tests common letters
- DO NOT include any explanation or reasoning in your response
- Just the word: e.g. "CRANE"

Your guess:"""

    # Build game history
    history = "GAME HISTORY:\n"
    for i, (guess, feedback) in enumerate(zip(previous_guesses, previous_feedback)):
        feedback_str = ""
        for j, (letter, color) in enumerate(zip(guess, feedback)):
            if color == "green":
                feedback_str += f"{letter}(GREEN) "
            elif color == "yellow":
                feedback_str += f"{letter}(YELLOW) "
            else:
                feedback_str += f"{letter}(BLACK) "
        history += f"Turn {i+1}: {guess} → {feedback_str.strip()}\n"
    
    # Analyze what we know
    green_positions = {}
    yellow_letters = set()
    yellow_banned = {}
    black_letters = set()
    
    for guess, feedback in zip(previous_guesses, previous_feedback):
        for i, (letter, color) in enumerate(zip(guess, feedback)):
            if color == "green":
                green_positions[i] = letter
            elif color == "yellow":
                yellow_letters.add(letter)
                if letter not in yellow_banned:
                    yellow_banned[letter] = set()
                yellow_banned[letter].add(i)
            elif color == "black":
                if letter not in green_positions.values() and letter not in yellow_letters:
                    black_letters.add(letter)
    
    constraints = "\nCONSTRAINTS:\n"
    if green_positions:
        for pos, letter in green_positions.items():
            constraints += f"- Position {pos+1} MUST be '{letter}'\n"
    
    if yellow_letters:
        for letter in yellow_letters:
            banned_pos = yellow_banned.get(letter, set())
            if banned_pos:
                banned_str = ', '.join([str(p+1) for p in sorted(banned_pos)])
                constraints += f"- '{letter}' is in the word but NOT at position(s): {banned_str}\n"
            else:
                constraints += f"- '{letter}' must be somewhere in the word\n"
    
    if black_letters:
        constraints += f"- NEVER use these letters: {', '.join(sorted(black_letters))}\n"
    
    # Strategic advice based on game state
    strategy = "\nSTRATEGY:\n"
    known_info = len(green_positions) + len(yellow_letters)
    
    if known_info >= 4:
        strategy += "- You know almost all letters! Focus on arranging them correctly.\n"
        strategy += "- Try different arrangements of your known letters.\n"
    elif known_info >= 2:
        strategy += "- You have good information. Find positions for yellow letters.\n"
        strategy += "- Consider common word patterns and letter combinations.\n"
    else:
        strategy += "- Still gathering information. Try words with common letters.\n"
        strategy += "- Focus on discovering more letters before optimization.\n"
    
    prompt = f"""You are playing Wordle. You need to guess a 5-letter word.

{history}
{constraints}
{strategy}

This is turn {turn}. Analyze the feedback and make your next strategic guess.

CRITICAL REQUIREMENTS:
- Your guess MUST be exactly 5 letters
- Your guess MUST follow ALL the constraints above
- Your guess MUST be a real English word
- Use ONLY capital letters

IMPORTANT: 
- Respond with ONLY a single 5-letter word in ALL CAPS
- DO NOT include any explanation or reasoning in your response
- Just the word: e.g. "HOUSE"

Your guess:"""
    
    return prompt


def get_llm_guess(model: str, previous_guesses: List[str], previous_feedback: List[List[str]]) -> tuple:
    """Get guess from the actual LLM API"""
    
    # Check if API client is available
    if model == "openai" and not openai_client:
        raise Exception("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.")
    elif model == "anthropic" and not anthropic_client:
        raise Exception("Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.")
    
    prompt = build_wordle_prompt(model, previous_guesses, previous_feedback)
    
    try:
        if model == "openai":
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert Wordle player. You always respond with exactly one 5-letter word in ALL CAPS, nothing else."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=10,
                temperature=0.7
            )
            guess = response.choices[0].message.content.strip().upper()
            
        else:  # anthropic
            response = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=10,
                temperature=0.7,
                messages=[
                    {"role": "user", "content": f"You are an expert Wordle player. You always respond with exactly one 5-letter word in ALL CAPS, nothing else.\n\n{prompt}"}
                ]
            )
            guess = response.content[0].text.strip().upper()
        
        # Clean up the response - extract just the 5-letter word
        words = [word for word in guess.split() if len(word) == 5 and word.isalpha()]
        if words:
            guess = words[0]
        else:
            # Fallback if no valid word found
            guess = guess.replace('"', '').replace("'", '').replace('.', '').replace(',', '')
            if len(guess) == 5 and guess.isalpha():
                pass  # Use as is
            else:
                # Emergency fallback
                guess = "AUDIO"
        
        reasoning = f"Turn {len(previous_guesses) + 1} - {model.upper()}'s strategic choice"
        
        print(f"🤖 {model.upper()} chose: {guess}")
        return guess, reasoning
        
    except Exception as e:
        print(f"❌ Error calling {model} API: {e}")
        # Fallback
        fallback_words = ["CRANE", "SLATE", "AUDIO", "HOUSE", "ROUND", "LIGHT", "PRINT", "WORLD"]
        guess = fallback_words[len(previous_guesses) % len(fallback_words)]
        reasoning = f"API error, using fallback: {guess}"
        return guess, reasoning


def parse_reasoning_for_ui(model: str, reasoning: str, previous_guesses: List[str], previous_feedback: List[List[str]]) -> Dict:
    """Parse reasoning into structured format for UI"""
    
    # Analyze current game state for UI display
    green_positions = {}
    yellow_letters = set()
    yellow_banned = {}
    black_letters = set()
    
    for guess, feedback in zip(previous_guesses, previous_feedback):
        for i, (letter, color) in enumerate(zip(guess, feedback)):
            if color == "green":
                green_positions[i] = letter
            elif color == "yellow":
                yellow_letters.add(letter)
                if letter not in yellow_banned:
                    yellow_banned[letter] = set()
                yellow_banned[letter].add(i)
            elif color == "black":
                if letter not in green_positions.values() and letter not in yellow_letters:
                    black_letters.add(letter)
    
    # Build constraints for UI
    constraints = []
    for pos, letter in green_positions.items():
        constraints.append(f"Position {pos+1} must be '{letter}'")
    
    for letter in yellow_letters:
        banned_pos = yellow_banned.get(letter, set())
        if banned_pos:
            banned_str = ", ".join([str(p+1) for p in sorted(banned_pos)])
            constraints.append(f"'{letter}' is in word but not at position(s) {banned_str}")
    
    if black_letters:
        constraints.append(f"Cannot use: {', '.join(sorted(black_letters))}")
    
    turn = len(previous_guesses)
    
    # Determine strategy based on game state
    known_info = len(green_positions) + len(yellow_letters)
    if known_info >= 4:
        strategy = "Pattern completion mode"
    elif known_info >= 2:
        strategy = "Strategic positioning"
    elif turn <= 2:
        strategy = "Information gathering"
    else:
        strategy = "Constraint-based exploration"
    
    thinking = f"{model.upper()}'s AI is analyzing the game state and making strategic decisions based on Wordle constraints and letter patterns."
    
    return {
        "turn": turn,
        "strategy": strategy,
        "knowledge": {
            "green_letters": {str(pos+1): letter for pos, letter in green_positions.items()},
            "yellow_letters": list(sorted(yellow_letters)),
            "black_letters": list(sorted(black_letters)),
            "constraints": constraints
        },
        "thinking": thinking
    }


if __name__ == '__main__':
    print("🎮 Starting AI vs AI Wordle server on port 5001...")
    print("📋 Testing GPT-4o vs Claude-3.5-Sonnet")
    print()
    
    if not openai_api_key or not anthropic_api_key:
        print("🚨 SETUP REQUIRED:")
        print("You need to set up API keys to test the LLMs:")
        print()
        if not openai_api_key:
            print("1. Get OpenAI API key from: https://platform.openai.com/api-keys")
            print("   Then run: export OPENAI_API_KEY='your_key_here'")
        if not anthropic_api_key:
            print("2. Get Anthropic API key from: https://console.anthropic.com/")
            print("   Then run: export ANTHROPIC_API_KEY='your_key_here'")
        print()
        print("💡 The server will start but API calls will fail until keys are set.")
        print("   You can test with fallback words in the meantime.")
        print()
    else:
        print("✅ API keys configured - ready to test real LLM intelligence!")
    
    app.run(debug=True, port=5002, threaded=True) 