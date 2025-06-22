"""
NYT Connections Game Implementation for VERSUS
"""

import json
import random
import os
from typing import Dict, List, Optional, Set
from openai import OpenAI
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ConnectionsGame:
    def __init__(self, puzzle_data: Optional[Dict] = None):
        """Initialize a new Connections game"""
        # Load puzzle data
        if puzzle_data:
            self.puzzle = puzzle_data
        else:
            # Load from JSON file
            json_path = os.path.join(os.path.dirname(__file__), 'connections_all.json')
            with open(json_path, 'r') as f:
                connections_data = json.load(f)
            self.puzzle = random.choice(connections_data)
        
        # Initialize game state
        self.id = self.puzzle['id']
        self.date = self.puzzle['date']
        self.answers = self.puzzle['answers']
        
        # Shuffle all words
        self.all_words = []
        for group in self.answers:
            self.all_words.extend(group['members'])
        random.shuffle(self.all_words)
        
        # Game state tracking
        self.remaining_words = self.all_words.copy()
        self.found_groups = []
        self.incorrect_guesses = []
        self.correct_guesses = []
        self.game_over = False
        self.winner = None
        self.current_player = None
        
        # Initialize AI clients
        self.openai_client = None
        self.anthropic_client = None
        
        if os.getenv('OPENAI_API_KEY'):
            self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        if os.getenv('ANTHROPIC_API_KEY'):
            self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    def check_guess(self, guess: List[str]) -> Dict:
        """Check if a guess of 4 words forms a valid group"""
        guess_set = set(word.upper() for word in guess)
        
        for group in self.answers:
            group_set = set(word.upper() for word in group['members'])
            if guess_set == group_set:
                return {
                    'correct': True,
                    'group_name': group['group'],
                    'level': group['level'],
                    'words': group['members']
                }
        
        return {'correct': False}
    
    def make_guess(self, player: str, guess: List[str]) -> Dict:
        """Process a guess from a player"""
        self.current_player = player
        
        # Normalize guess
        guess = [word.upper() for word in guess]
        
        # Check if guess is valid
        result = self.check_guess(guess)
        
        if result['correct']:
            # Remove words from remaining
            for word in guess:
                if word in self.remaining_words:
                    self.remaining_words.remove(word)
            
            # Add to found groups with player info
            result['found_by'] = player
            self.found_groups.append(result)
            self.correct_guesses.append(guess)
            
            # Check if game is complete
            if len(self.found_groups) == 4:
                self.game_over = True
                # Determine winner based on who found more groups
                player_counts = {}
                for group in self.found_groups:
                    found_by = group.get('found_by', 'Unknown')
                    player_counts[found_by] = player_counts.get(found_by, 0) + 1
                
                # Find player with most groups
                max_groups = max(player_counts.values())
                winners = [p for p, count in player_counts.items() if count == max_groups]
                
                if len(winners) == 1:
                    self.winner = winners[0]
                else:
                    self.winner = None  # It's a tie
        else:
            # Add to incorrect guesses
            self.incorrect_guesses.append(guess)
        
        return {
            'result': result,
            'remaining_words': self.remaining_words,
            'found_groups': self.found_groups,
            'game_over': self.game_over,
            'winner': self.winner
        }
    
    def get_ai_guess(self, model_type: str) -> Optional[List[str]]:
        """Get an AI guess for the current state"""
        # Build prompt
        correct_history = ""
        if self.correct_guesses:
            correct_history = "\nPrevious correct groups (you cannot guess these words again):\n" + "\n".join(
                f"- {', '.join(g)}" for g in self.correct_guesses
            )
        
        incorrect_history = ""
        if self.incorrect_guesses:
            incorrect_history = "\nPrevious incorrect guesses (you cannot guess the same combination again):\n" + "\n".join(
                f"- {', '.join(g)}" for g in self.incorrect_guesses
            )
        
        prompt = f"""You are playing NYT Connections. Group 4 words that share a theme.

Available words: {', '.join(self.remaining_words)}{correct_history}{incorrect_history}

Respond with ONLY the 4 words separated by commas, no explanation. Your response will be checked against the puzzle's answers.

Example of correct output format (no extra text):
WORD1, WORD2, WORD3, WORD4"""
        
        try:
            if model_type == 'openai' and self.openai_client:
                resp = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=50,
                    temperature=0.7
                )
                text = resp.choices[0].message.content
            elif model_type == 'anthropic' and self.anthropic_client:
                resp = self.anthropic_client.messages.create(
                    model="claude-3-haiku-20240307",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=50,
                    temperature=0.7
                )
                text = resp.content[0].text
            else:
                return None
            
            # Parse response
            parts = [w.strip().upper() for w in text.split(',')]
            if len(parts) == 4:
                return parts
            else:
                print(f"[Error] Malformed guess from {model_type}: expected 4 words, got {len(parts)}")
                return None
                
        except Exception as e:
            print(f"Error getting AI guess from {model_type}: {e}")
            return None
    
    def get_game_state(self) -> Dict:
        """Get the current game state"""
        return {
            'puzzle_id': self.id,
            'date': self.date,
            'all_words': self.all_words,
            'remaining_words': self.remaining_words,
            'found_groups': self.found_groups,
            'incorrect_guesses': self.incorrect_guesses,
            'game_over': self.game_over,
            'winner': self.winner,
            'solution': self.answers if self.game_over else None
        } 