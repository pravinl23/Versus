"""
NYT Connections Game Implementation for VERSUS
"""

import json
import random
import os
from typing import Dict, List, Optional, Set
from src.utils.common import LLMClient
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
    
    def _get_smart_guess(self) -> Optional[List[str]]:
        """Try to make an educated guess based on common patterns"""
        if len(self.remaining_words) < 4:
            return None
            
        remaining_upper = [w.upper() for w in self.remaining_words]
        
        # Special logic when only 8 words remain (2 groups found)
        if len(self.remaining_words) == 8:
            # Try all possible combinations more systematically
            import itertools
            
            # First, try to find words that might form phrases
            for i in range(len(remaining_upper)):
                for j in range(i+1, len(remaining_upper)):
                    word1, word2 = remaining_upper[i], remaining_upper[j]
                    # Check if these could form a phrase
                    phrase_patterns = [
                        f"{word1} {word2}", f"{word2} {word1}",
                        f"{word1}'S {word2}", f"{word2}'S {word1}",
                        f"{word1}-{word2}", f"{word2}-{word1}"
                    ]
                    # If any pattern seems like a common phrase, look for 2 more words
                    for pattern in phrase_patterns:
                        if len(pattern) < 15:  # Reasonable phrase length
                            # Try to find 2 more words that could fit
                            other_words = [w for w in remaining_upper if w not in [word1, word2]]
                            if len(other_words) >= 2:
                                # Take any 2 other words to complete the group
                                return [word1, word2] + other_words[:2]
            
            # Try grouping by length when desperate
            length_groups = {}
            for word in remaining_upper:
                length = len(word)
                if length not in length_groups:
                    length_groups[length] = []
                length_groups[length].append(word)
            
            # If we have exactly 4 words of the same length, try those
            for length, words in length_groups.items():
                if len(words) == 4:
                    return words
            
            # Last resort: try the 4 shortest or 4 longest words
            sorted_by_length = sorted(remaining_upper, key=len)
            return sorted_by_length[:4]  # Try shortest first
        
        # Original strategies for other cases
        # Strategy 1: Look for words with common suffixes
        suffix_groups = {}
        for word in remaining_upper:
            if len(word) > 3:
                # Check last 2-4 characters
                for suffix_len in [2, 3, 4]:
                    if len(word) > suffix_len:
                        suffix = word[-suffix_len:]
                        if suffix not in suffix_groups:
                            suffix_groups[suffix] = []
                        suffix_groups[suffix].append(word)
        
        # Find suffix groups with 4+ words
        for suffix, words in suffix_groups.items():
            if len(words) >= 4:
                return words[:4]
        
        # Strategy 2: Look for words with common prefixes
        prefix_groups = {}
        for word in remaining_upper:
            if len(word) > 3:
                # Check first 2-4 characters
                for prefix_len in [2, 3, 4]:
                    if len(word) > prefix_len:
                        prefix = word[:prefix_len]
                        if prefix not in prefix_groups:
                            prefix_groups[prefix] = []
                        prefix_groups[prefix].append(word)
        
        # Find prefix groups with 4+ words
        for prefix, words in prefix_groups.items():
            if len(words) >= 4:
                return words[:4]
        
        # Strategy 3: Look for words of the same length
        length_groups = {}
        for word in remaining_upper:
            length = len(word)
            if length not in length_groups:
                length_groups[length] = []
            length_groups[length].append(word)
        
        # Find length groups with 4+ words
        for length, words in length_groups.items():
            if len(words) >= 4:
                return words[:4]
        
        # Strategy 4: Random selection as last resort
        return random.sample(self.remaining_words, 4)
    
    def get_ai_guess(self, model_id: str) -> Optional[List[str]]:
        """Get an AI guess for the current state"""
        # Create LLM client with the model ID
        llm_client = LLMClient(model_id)
        
        # Build prompt
        correct_history = ""
        if self.correct_guesses:
            correct_history = "\n\nAlready found groups (DO NOT use these words):\n" + "\n".join(
                f"✓ {', '.join(g)}" for g in self.correct_guesses
            )
        
        incorrect_history = ""
        recent_incorrect = self.incorrect_guesses[-3:] if len(self.incorrect_guesses) > 3 else self.incorrect_guesses
        if recent_incorrect:
            incorrect_history = "\n\nRecent incorrect attempts (avoid these exact combinations):\n" + "\n".join(
                f"✗ {', '.join(g)}" for g in recent_incorrect
            )
        
        # Special strategy when 2 groups found (8 words left)
        strategy_hint = ""
        if len(self.found_groups) == 2:
            strategy_hint = "\n\n⚠️ CRITICAL: Only 2 groups remain (8 words total). The connections might be:\n" \
                          "- Less obvious wordplay or double meanings\n" \
                          "- Words that can complete phrases (e.g., ___ BELL)\n" \
                          "- Homophones or words that sound like other words\n" \
                          "- Pop culture references or slang meanings\n" \
                          "Try DIFFERENT types of connections than what you've already found!"
        elif len(self.incorrect_guesses) > 10:
            strategy_hint = "\n\nHINT: Look for less obvious connections like wordplay, homophones, or phrases that contain these words."
        elif len(self.incorrect_guesses) > 5:
            strategy_hint = "\n\nHINT: Consider different types of connections - categories, word associations, or common phrases."
        
        # Add pattern analysis
        pattern_analysis = self._analyze_patterns()
        
        # Enhanced prompt for when 2 groups are found
        if len(self.found_groups) == 2:
            prompt = f"""NYT Connections: Find 4 words that share a common theme.

CRITICAL SITUATION: You have found 2 groups. Only 2 groups remain among these 8 words.

Available words ({len(self.remaining_words)} remaining):
{', '.join(sorted(self.remaining_words))}{correct_history}{incorrect_history}{strategy_hint}{pattern_analysis}

The remaining groups are likely to be TRICKY. Consider:
1. Words that can go BEFORE or AFTER another word (e.g., TIME + zone/keeper/line)
2. Homophones or words that SOUND like something else
3. Slang, informal meanings, or pop culture references
4. Words that are parts of common phrases or idioms
5. Double meanings or wordplay

Think step by step about EACH remaining word and its possible connections.

Respond with ONLY 4 words separated by commas."""
        else:
            prompt = f"""NYT Connections: Find 4 words that share a common theme.

RULES:
- Select exactly 4 words that form a group
- Common themes include: categories (e.g., types of birds), word associations (e.g., things that are red), phrases (e.g., words that go with 'time'), or wordplay
- Each word belongs to exactly one group

Available words ({len(self.remaining_words)} remaining):
{', '.join(sorted(self.remaining_words))}{correct_history}{incorrect_history}{strategy_hint}{pattern_analysis}

Think step by step:
1. Look for obvious categories first (animals, colors, etc.)
2. Check for words that can complete phrases (e.g., ___ BELL, ___ CAKE)
3. Consider less obvious connections (homophones, slang meanings)

Respond with ONLY 4 words separated by commas. Example format:
WORD1, WORD2, WORD3, WORD4"""
        
        try:
            # Get response using the common get_response method
            # Use lower temperature for more focused guessing
            response = llm_client.get_response(prompt, max_tokens=50, temperature=0.3)
            
            # Clean and parse response
            # Remove any common prefixes the model might add
            response = response.strip()
            for prefix in ["Answer:", "Guess:", "Response:", "My guess:", "I choose:"]:
                if response.startswith(prefix):
                    response = response[len(prefix):].strip()
            
            # Parse response - handle various separators
            import re
            # Split on comma, semicolon, or multiple spaces
            parts = re.split(r'[,;]\s*|\s{2,}', response)
            parts = [w.strip().upper() for w in parts if w.strip()]
            
            # Filter to only valid words from remaining_words
            valid_parts = [w for w in parts if w in [rw.upper() for rw in self.remaining_words]]
            
            if len(valid_parts) >= 4:
                # Take first 4 valid words
                return valid_parts[:4]
            elif len(valid_parts) == 4:
                return valid_parts
            else:
                # If we don't have enough valid words, try a fallback strategy
                print(f"[Warning] {model_id} gave incomplete guess: {parts}")
                
                # Fallback: use smart guessing strategy
                return self._get_smart_guess()
                
        except Exception as e:
            print(f"Error getting AI guess from {model_id}: {e}")
            # Fallback strategy on error
            return self._get_smart_guess()
    
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
    
    def _analyze_patterns(self) -> str:
        """Analyze remaining words for patterns to help guide the AI"""
        if len(self.remaining_words) < 4:
            return ""
            
        patterns = []
        remaining_upper = [w.upper() for w in self.remaining_words]
        
        # Check for common word endings
        endings = {}
        for word in remaining_upper:
            if len(word) > 3:
                ending = word[-3:]
                if ending not in endings:
                    endings[ending] = 0
                endings[ending] += 1
        
        common_endings = [end for end, count in endings.items() if count >= 3]
        if common_endings:
            patterns.append(f"Words ending in: {', '.join(common_endings)}")
        
        # Check for potential compound words or phrases
        short_words = [w for w in remaining_upper if len(w) <= 4]
        if len(short_words) >= 4:
            patterns.append("Several short words that might form phrases")
        
        # Check for words that might be categories
        category_indicators = ['TYPES', 'KINDS', 'FORMS', 'WAYS']
        for indicator in category_indicators:
            if any(indicator in word for word in remaining_upper):
                patterns.append("Words that might be categories or types of something")
                break
        
        if patterns:
            return "\n\nPATTERN HINTS: " + ", ".join(patterns)
        return "" 