"""
Wordle game implementation for AI vs AI battles
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
from typing import Dict, List, Tuple, Optional
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import LLMClient

app = Flask(__name__)
CORS(app)

# In-memory game state storage
game_states = {}


class WordleGame:
    def __init__(self, secret_word: str):
        self.secret_word = secret_word.upper()
        self.game_id = datetime.now().timestamp()
        self.models = {
            "openai": {
                "guesses": [],
                "feedback": [],
                "reasoning": [],
                "won": False
            },
            "anthropic": {
                "guesses": [],
                "feedback": [],
                "reasoning": [],
                "won": False
            }
        }
        self.game_over = False
        self.winner = None
    
    def get_feedback(self, guess: str) -> List[str]:
        """Generate feedback for a guess (green/yellow/gray)"""
        guess = guess.upper()
        feedback = []
        secret_chars = list(self.secret_word)
        
        # First pass: mark exact matches (green)
        for i, letter in enumerate(guess):
            if letter == self.secret_word[i]:
                feedback.append("green")
                secret_chars[i] = None  # Mark as used
            else:
                feedback.append(None)
        
        # Second pass: mark partial matches (yellow)
        for i, letter in enumerate(guess):
            if feedback[i] is None:
                if letter in secret_chars:
                    feedback[i] = "yellow"
                    # Remove first occurrence
                    secret_chars[secret_chars.index(letter)] = None
                else:
                    feedback[i] = "gray"
        
        return feedback
    
    def make_guess(self, model: str, guess: str, reasoning: str) -> Dict:
        """Process a guess from a model"""
        if self.game_over:
            return {"error": "Game is already over"}
        
        if len(self.models[model]["guesses"]) >= 6:
            return {"error": f"{model} has used all 6 guesses"}
        
        guess = guess.upper()
        if len(guess) != 5 or not guess.isalpha():
            return {"error": "Guess must be a 5-letter word"}
        
        # Get feedback
        feedback = self.get_feedback(guess)
        
        # Update model state
        self.models[model]["guesses"].append(guess)
        self.models[model]["feedback"].append(feedback)
        self.models[model]["reasoning"].append(reasoning)
        
        # Check if won
        if guess == self.secret_word:
            self.models[model]["won"] = True
            self.game_over = True
            self.winner = model
        
        # Check if both models have used all guesses
        elif all(len(self.models[m]["guesses"]) >= 6 for m in self.models):
            self.game_over = True
        
        return {
            "success": True,
            "feedback": feedback,
            "game_over": self.game_over,
            "winner": self.winner
        }
    
    def get_state(self) -> Dict:
        """Get the current game state"""
        return {
            "game_id": self.game_id,
            "models": self.models,
            "game_over": self.game_over,
            "winner": self.winner,
            "secret_word": self.secret_word if self.game_over else None
        }


# Current active game
current_game = None


@app.route('/api/wordle/start', methods=['POST'])
def start_game():
    """Start a new Wordle game"""
    global current_game
    
    data = request.json
    secret_word = data.get('secret_word', '').upper()
    
    if len(secret_word) != 5 or not secret_word.isalpha():
        return jsonify({"error": "Secret word must be a 5-letter word"}), 400
    
    current_game = WordleGame(secret_word)
    return jsonify({
        "success": True,
        "game_id": current_game.game_id
    })


@app.route('/api/wordle/state', methods=['GET'])
def get_state():
    """Get the current game state"""
    if not current_game:
        return jsonify({"error": "No active game"}), 404
    
    return jsonify(current_game.get_state())


@app.route('/api/wordle/guess', methods=['POST'])
async def make_guess():
    """Get a guess from an AI model"""
    if not current_game:
        return jsonify({"error": "No active game"}), 404
    
    data = request.json
    model = data.get('model')
    
    if model not in ['openai', 'anthropic']:
        return jsonify({"error": "Invalid model"}), 400
    
    # Get the model's history
    model_data = current_game.models[model]
    
    # Create prompt for the AI
    prompt = create_wordle_prompt(
        model_data['guesses'],
        model_data['feedback'],
        data.get('secret', '')  # For testing, in production this wouldn't be sent
    )
    
    # Get AI response
    llm_client = LLMClient(model.upper())
    response = await get_ai_guess(llm_client, prompt)
    
    # Parse AI response
    guess = response.get('guess', '').upper()
    reasoning = response.get('reasoning', '')
    
    # Make the guess
    result = current_game.make_guess(model, guess, reasoning)
    
    if 'error' in result:
        return jsonify(result), 400
    
    return jsonify({
        "guess": guess,
        "reasoning": reasoning,
        "feedback": result['feedback'],
        "game_over": result['game_over'],
        "winner": result['winner']
    })


def create_wordle_prompt(guesses: List[str], feedback: List[List[str]], secret: str = "") -> str:
    """Create a prompt for the AI to make a Wordle guess"""
    prompt = """You are playing Wordle. You need to guess a 5-letter English word.

Rules:
- You have 6 attempts to guess the word
- After each guess, you receive feedback:
  - Green: The letter is correct and in the right position
  - Yellow: The letter is in the word but in the wrong position
  - Gray: The letter is not in the word

"""
    
    if guesses:
        prompt += "Your previous guesses and feedback:\n"
        for i, (guess, fb) in enumerate(zip(guesses, feedback)):
            prompt += f"{i+1}. {guess}: "
            fb_text = []
            for j, (letter, color) in enumerate(zip(guess, fb)):
                if color == "green":
                    fb_text.append(f"{letter} is correct at position {j+1}")
                elif color == "yellow":
                    fb_text.append(f"{letter} is in the word but not at position {j+1}")
                else:
                    fb_text.append(f"{letter} is not in the word")
            prompt += ", ".join(fb_text) + "\n"
        prompt += "\n"
    
    prompt += """Based on the feedback, make your next guess. 
Respond in this exact JSON format:
{
    "guess": "YOURWORD",
    "reasoning": "Brief explanation of why you chose this word"
}"""
    
    return prompt


async def get_ai_guess(llm_client: LLMClient, prompt: str) -> Dict:
    """Get a guess from the AI model"""
    try:
        if llm_client.model_type == "OPENAI":
            response = llm_client.client.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are playing Wordle. Always respond in the exact JSON format requested."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            content = response.choices[0].message.content
            return json.loads(content)
            
        elif llm_client.model_type == "ANTHROPIC":
            response = llm_client.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=200,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            content = response.content[0].text
            return json.loads(content)
    except Exception as e:
        # Fallback response
        return {
            "guess": "CRANE",  # Common starting word
            "reasoning": f"Error getting AI response: {str(e)}"
        }


if __name__ == '__main__':
    app.run(debug=True, port=5001) 