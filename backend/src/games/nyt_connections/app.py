# app.py
from flask import Flask, render_template, jsonify, request
import json
import random
import os
from openai import OpenAI
from anthropic import Anthropic
from dotenv import load_dotenv
import traceback

# Load environment variables from one level up
load_dotenv('../.env')

app = Flask(__name__)

# Read keys
OPENAI_API_KEY    = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Initialize OpenAI client
if OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("OpenAI client initialized successfully")
    except Exception as e:
        print(f"Warning: Failed to initialize OpenAI client: {e}")
else:
    print("Warning: OPENAI_API_KEY not found or empty")

# Initialize Anthropic client
if ANTHROPIC_API_KEY:
    try:
        anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
        print("Anthropic client initialized successfully")
    except Exception as e:
        print(f"Warning: Failed to initialize Anthropic client: {e}")
else:
    print("Warning: ANTHROPIC_API_KEY not found or empty")

# Load your puzzles
with open('connections_all.json', 'r') as f:
    connections_data = json.load(f)

def get_random_puzzle():
    return random.choice(connections_data)

def shuffle_words(puzzle):
    all_words = []
    for group in puzzle['answers']:
        all_words.extend(group['members'])
    random.shuffle(all_words)
    return all_words

def check_guess(guess, answers):
    guess_set = set(guess)
    for group in answers:
        if guess_set == set(group['members']):
            return {
                'correct': True,
                'group_name': group['group'],
                'level': group['level'],
                'words': group['members']
            }
    return {'correct': False}

def get_ai_guess(model_type, words, previous_guesses, previous_correct):
    # ——— LOGGING HEADER ———
    print("\n" + "="*10 + f" {model_type.upper()} TURN " + "="*10)
    print("Available words:  ", ", ".join(words))
    if previous_correct:
        print("Previous correct groups:")
        for grp in previous_correct:
            print("  •", ", ".join(grp))
    if previous_guesses:
        print("Previous incorrect guesses:")
        for grp in previous_guesses:
            print("  •", ", ".join(grp))

    # Build prompt (now includes correct history too)
    correct_history = ""
    if previous_correct:
        correct_history = "\nPrevious correct groups. You cannot guess these words again:\n" + "\n".join(
            f"- {', '.join(g)}" for g in previous_correct
        )

    incorrect_history = ""
    if previous_guesses:
        incorrect_history = "\nPrevious incorrect guesses. You cannot guess the same combination of 4 words again:\n" + "\n".join(
            f"- {', '.join(g)}" for g in previous_guesses
        )

    prompt = f"""You are playing NYT Connections.  Group 4 words that share a theme.

Available words: {', '.join(words)}{correct_history}{incorrect_history}

Respond with ONLY the 4 words separated by commas, no explanation.  Your response will be checked against the puzzle's answers.

Example of correct output format (no extra text):
WORD1, WORD2, WORD3, WORD4
"""

    # ——— LOGGING PROMPT ———
    print("Prompt sent:")
    print(prompt)

    try:
        if model_type == 'chatgpt':
            resp = openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role":"user","content":prompt}],
                max_tokens=50,
                temperature=0.7
            )
            text = resp.choices[0].message.content
        else:
            resp = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                messages=[{"role":"user","content":prompt}],
                max_tokens=50,
                temperature=0.7
            )
            text = resp.content[0].text

        # *** DEBUG LOG ***
        print(f"[{model_type.upper()}] output: {text!r}")

        parts = [w.strip().upper() for w in text.split(',')]
        if len(parts) == 4:
            return parts
        else:
            print(f"[Error] Malformed guess (expected 4 words): {parts}")
            return None

    except Exception as e:
        print(f"Error getting AI guess: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/new-game')
def new_game():
    puzzle = get_random_puzzle()
    return jsonify({
        'puzzle_id':  puzzle['id'],
        'date':       puzzle['date'],
        'words':      shuffle_words(puzzle),
        'puzzle_info': f"Puzzle from {puzzle['date']} (levels 0-3).",
        'solution':   puzzle['answers']
    })


@app.route('/api/ai-turn', methods=['POST'])
def ai_turn():
    data = request.json
    try:
        guess = get_ai_guess(
            data['model'],
            data['words'],
            data.get('previous_guesses', []),
            data.get('previous_correct', [])
        )
        result = check_guess(guess, data['solution'])
        if result.get('correct'):
            print(f"[{data['model'].upper()}] Correct guess: {guess} ➜ {result['group_name']} (Level {result['level']})")

        return jsonify({
            'guess':  guess,
            'result': result
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting NYT Connections AI Battle server…")
    app.run(debug=True, port=5000)