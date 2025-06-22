"""
Trivia Game Implementation for VERSUS platform
"""

import asyncio
import time
import random
import os
from typing import Dict, Any, List, Optional, Set
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.common import BaseGame, LLMClient

class TriviaGame(BaseGame):
    """Trivia game where two LLMs compete answering questions"""
    
    def __init__(self, player1_model: str, player2_model: str, questions: List[Dict[str, Any]]):
        self.questions = questions
        
        # Each player has their own question index and progress
        self.player1_question_index = 0
        self.player2_question_index = 0
        
        self.player1_score = 0
        self.player2_score = 0
        self.player1_times = []
        self.player2_times = []
        self.player1_responses = []  # Store player 1 responses
        self.player2_responses = []  # Store player 2 responses
        
        # Track wrong answers for penalty system
        self.player1_wrong_answers: Dict[int, Set[str]] = {}  # question_index -> set of wrong choices
        self.player2_wrong_answers: Dict[int, Set[str]] = {}
        
        # Track cooldown periods
        self.player1_cooldown_until = 0  # timestamp when cooldown ends
        self.player2_cooldown_until = 0
        
        # Race state
        self.race_finished = False
        self.race_winner = None
        self.race_start_time = None
        
        super().__init__(player1_model, player2_model)
    
    def initialize_game(self) -> Dict[str, Any]:
        """Initialize the trivia race game state"""
        import time
        self.race_start_time = time.time()
        
        return {
            "total_questions": len(self.questions),
            "player1_question_index": 0,
            "player2_question_index": 0,
            "player1_score": 0,
            "player2_score": 0,
            "player1_avg_time": 0,
            "player2_avg_time": 0,
            "race_finished": False,
            "race_winner": None,
            "player1_responses": [],
            "player2_responses": []
        }
    
    def get_player_current_question(self, player: int) -> Optional[Dict[str, Any]]:
        """Get the current question for a specific player"""
        if player == 1:
            if self.player1_question_index < len(self.questions):
                return self.questions[self.player1_question_index]
        elif player == 2:
            if self.player2_question_index < len(self.questions):
                return self.questions[self.player2_question_index]
        return None
    
    async def ask_question_to_player(self, player: int) -> Dict[str, Any]:
        """Ask current question to a specific player"""
        current_time = time.time()
        
        # Check if player is still in cooldown
        if player == 1 and current_time < self.player1_cooldown_until:
            remaining_cooldown = self.player1_cooldown_until - current_time
            return {
                "error": f"Player 1 is in cooldown for {remaining_cooldown:.1f} more seconds",
                "cooldown_remaining": remaining_cooldown,
                "player": player
            }
        elif player == 2 and current_time < self.player2_cooldown_until:
            remaining_cooldown = self.player2_cooldown_until - current_time
            return {
                "error": f"Player 2 is in cooldown for {remaining_cooldown:.1f} more seconds", 
                "cooldown_remaining": remaining_cooldown,
                "player": player
            }
        
        current_question = self.get_player_current_question(player)
        if not current_question:
            return {"error": f"No more questions for player {player}"}
        
        # Get the current question index for tracking wrong answers
        question_index = self.player1_question_index if player == 1 else self.player2_question_index
        
        # Get wrong answers for this question
        wrong_answers = (self.player1_wrong_answers.get(question_index, set()) if player == 1 
                        else self.player2_wrong_answers.get(question_index, set()))
        
        # Format the prompt for the model (excluding wrong choices)
        prompt = self._format_question_prompt(current_question, wrong_answers)
        
        # Get the appropriate model
        model = self.player1 if player == 1 else self.player2
        
        # Time and get response from the model
        start_time = time.time()
        response, response_time = await self._get_model_response(model, prompt)
        
        # Evaluate answer
        correct_answer = current_question["correct_answer"].lower().strip()
        is_correct = self._evaluate_answer(response, correct_answer)
        
        # Store response data
        response_data = {
            "player": player,
            "question_number": question_index + 1,
            "question": current_question,
            "response": response,
            "correct": is_correct,
            "time": response_time,
            "correct_answer": current_question["correct_answer"],
            "wrong_answers_so_far": list(wrong_answers),
            "attempt_number": len(wrong_answers) + 1
        }
        
        # Update player state
        if is_correct:
            # Correct answer - advance to next question and clear wrong answers
            if player == 1:
                self.player1_responses.append(response_data)
                self.player1_times.append(response_time)
                self.player1_score += 1
                self.player1_question_index += 1
                # Clear wrong answers for this question
                if question_index in self.player1_wrong_answers:
                    del self.player1_wrong_answers[question_index]
            else:
                self.player2_responses.append(response_data)
                self.player2_times.append(response_time)
                self.player2_score += 1
                self.player2_question_index += 1
                # Clear wrong answers for this question
                if question_index in self.player2_wrong_answers:
                    del self.player2_wrong_answers[question_index]
        else:
            # Wrong answer - apply penalty
            if player == 1:
                self.player1_responses.append(response_data)
                # Add wrong answer to tracking
                if question_index not in self.player1_wrong_answers:
                    self.player1_wrong_answers[question_index] = set()
                self.player1_wrong_answers[question_index].add(self._normalize_choice(response))
                # Apply 1 second cooldown
                self.player1_cooldown_until = time.time() + 1.0
                response_data["cooldown_applied"] = True
                response_data["cooldown_until"] = self.player1_cooldown_until
            else:
                self.player2_responses.append(response_data)
                # Add wrong answer to tracking
                if question_index not in self.player2_wrong_answers:
                    self.player2_wrong_answers[question_index] = set()
                self.player2_wrong_answers[question_index].add(self._normalize_choice(response))
                # Apply 1 second cooldown
                self.player2_cooldown_until = time.time() + 1.0
                response_data["cooldown_applied"] = True
                response_data["cooldown_until"] = self.player2_cooldown_until
        
        # Check if this player finished the race (only if they got the answer right)
        if is_correct:
            player_finished = (self.player1_question_index >= len(self.questions) if player == 1 
                              else self.player2_question_index >= len(self.questions))
            
            if player_finished and not self.race_finished:
                self.race_finished = True
                self.race_winner = player
                self.game_over = True
                self.winner = player
        
        # Update game state
        self._update_game_state()
        
        return response_data
    
    async def _get_model_response(self, model: LLMClient, prompt: str) -> tuple:
        """Get response from a model with timing"""
        start_time = time.time()
        try:
            response = await self._query_model(model, prompt)
            end_time = time.time()
            return response, end_time - start_time
        except Exception as e:
            end_time = time.time()
            return f"Error: {str(e)}", end_time - start_time
    
    async def _query_model(self, model: LLMClient, prompt: str) -> str:
        """Query a specific model based on its type"""
        try:
            if model.model_type == "OPENAI":
                response = await model.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are competing in a trivia contest. Give short, direct answers only. Do not explain your reasoning."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=50,
                    temperature=0.1
                )
                return response.choices[0].message.content.strip()
            
            elif model.model_type == "ANTHROPIC":
                import asyncio
                import httpx
                import json
                
                # Direct API call since library is having issues
                api_key = os.getenv("ANTHROPIC_API_KEY")
                
                async def anthropic_api_call():
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://api.anthropic.com/v1/messages",
                            headers={
                                "Content-Type": "application/json",
                                "x-api-key": api_key,
                                "anthropic-version": "2023-06-01"
                            },
                            json={
                                "model": "claude-3-haiku-20240307",
                                "max_tokens": 50,
                                "messages": [{"role": "user", "content": prompt}],
                                "system": "You are competing in a trivia contest. Give short, direct answers only. Do not explain your reasoning."
                            }
                        )
                        result = response.json()
                        if "content" in result and result["content"]:
                            return result["content"][0]["text"]
                        else:
                            return f"API Error: {result}"
                
                response_text = await anthropic_api_call()
                return response_text.strip()
            
            elif model.model_type == "GEMINI":
                model_instance = model.client.GenerativeModel('gemini-pro')
                response = await model_instance.generate_content_async(
                    f"System: You are competing in a trivia contest. Give short, direct answers only. Do not explain your reasoning.\n\nUser: {prompt}"
                )
                return response.text.strip()
            
            elif model.model_type == "GROQ":
                response = await model.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "You are competing in a trivia contest. Give short, direct answers only. Do not explain your reasoning."},
                        {"role": "user", "content": prompt}
                    ],
                    model="mixtral-8x7b-32768",
                    max_tokens=50,
                    temperature=0.1
                )
                return response.choices[0].message.content.strip()
            
            else:
                return "Unsupported model type"
                
        except Exception as e:
            return f"API Error: {str(e)}"
    
    def _format_question_prompt(self, question: Dict[str, Any], wrong_answers: Set[str] = None) -> str:
        """Format question for the LLM, excluding wrong answers"""
        if wrong_answers is None:
            wrong_answers = set()
            
        prompt = f"Question: {question['question']}\n"
        
        if "choices" in question and question["choices"]:
            prompt += "Options:\n"
            available_choices = []
            choice_letters = []
            
            for i, choice in enumerate(question["choices"]):
                choice_letter = chr(65 + i)  # A, B, C, D
                # Check if this choice should be excluded
                if (choice not in wrong_answers and 
                    choice_letter not in wrong_answers and 
                    choice.lower() not in wrong_answers):
                    available_choices.append(choice)
                    choice_letters.append(choice_letter)
                    prompt += f"{choice_letter}. {choice}\n"
            
            if len(available_choices) > 1:
                prompt += f"\nAnswer with just the letter ({', '.join(choice_letters)}) or the answer text:"
            else:
                prompt += "\nOnly one option remaining. Answer with the letter or text:"
        else:
            prompt += "\nProvide a short, direct answer:"
        
        # Add penalty reminder if there were previous wrong attempts
        if wrong_answers:
            prompt += f"\n(Note: You previously answered incorrectly with: {', '.join(wrong_answers)})"
        
        return prompt
    
    def _normalize_choice(self, response: str) -> str:
        """Normalize a response to track as a wrong answer"""
        response = response.lower().strip()
        
        # If it's just a letter (A, B, C, D), return as is
        if len(response) == 1 and response.isalpha():
            return response.upper()
        
        # If it starts with a letter followed by period/space, extract the letter
        if len(response) >= 2 and response[0].isalpha() and response[1] in '. ':
            return response[0].upper()
        
        # Otherwise return the cleaned response text
        return response.strip()
    
    def _evaluate_answer(self, response: str, correct_answer: str) -> bool:
        """Evaluate if the response is correct"""
        response = response.lower().strip()
        correct_answer = correct_answer.lower().strip()
        
        # Direct match
        if response == correct_answer:
            return True
        
        # Check if response contains the correct answer
        if correct_answer in response or response in correct_answer:
            return True
        
        # For multiple choice, check if just the letter matches
        if len(correct_answer) == 1 and correct_answer.isalpha():
            if response.startswith(correct_answer) or response.endswith(correct_answer):
                return True
        
        return False
    
    def _determine_winner(self) -> Optional[int]:
        """Determine the winner based on score and time"""
        if self.player1_score > self.player2_score:
            return 1
        elif self.player2_score > self.player1_score:
            return 2
        else:
            # Tie-breaker: faster average response time
            avg1 = sum(self.player1_times) / len(self.player1_times) if self.player1_times else float('inf')
            avg2 = sum(self.player2_times) / len(self.player2_times) if self.player2_times else float('inf')
            return 1 if avg1 < avg2 else 2
    
    def _update_game_state(self):
        """Update the current game state"""
        current_time = time.time()
        
        self.game_state.update({
            "player1_question_index": self.player1_question_index,
            "player2_question_index": self.player2_question_index,
            "player1_score": self.player1_score,
            "player2_score": self.player2_score,
            "player1_avg_time": sum(self.player1_times) / len(self.player1_times) if self.player1_times else 0,
            "player2_avg_time": sum(self.player2_times) / len(self.player2_times) if self.player2_times else 0,
            "race_finished": self.race_finished,
            "race_winner": self.race_winner,
            "player1_responses": self.player1_responses,
            "player2_responses": self.player2_responses,
            # Cooldown information
            "player1_in_cooldown": current_time < self.player1_cooldown_until,
            "player2_in_cooldown": current_time < self.player2_cooldown_until,
            "player1_cooldown_remaining": max(0, self.player1_cooldown_until - current_time),
            "player2_cooldown_remaining": max(0, self.player2_cooldown_until - current_time),
            # Wrong answer tracking
            "player1_wrong_answers": {str(k): list(v) for k, v in self.player1_wrong_answers.items()},
            "player2_wrong_answers": {str(k): list(v) for k, v in self.player2_wrong_answers.items()}
        })

    def get_final_results(self) -> Dict[str, Any]:
        """Get comprehensive final race results"""
        race_time = time.time() - self.race_start_time if self.race_start_time else 0
        
        # Calculate penalty statistics
        total_wrong_attempts_p1 = sum(len(wrong_set) for wrong_set in self.player1_wrong_answers.values())
        total_wrong_attempts_p2 = sum(len(wrong_set) for wrong_set in self.player2_wrong_answers.values())
        
        return {
            "game_over": True,
            "race_finished": self.race_finished,
            "race_winner": self.race_winner,
            "race_time": race_time,
            "final_scores": {
                "player1": self.player1_score,
                "player2": self.player2_score
            },
            "questions_completed": {
                "player1": self.player1_question_index,
                "player2": self.player2_question_index
            },
            "average_times": {
                "player1": sum(self.player1_times) / len(self.player1_times) if self.player1_times else 0,
                "player2": sum(self.player2_times) / len(self.player2_times) if self.player2_times else 0
            },
            "penalty_stats": {
                "player1_total_wrong_attempts": total_wrong_attempts_p1,
                "player2_total_wrong_attempts": total_wrong_attempts_p2,
                "player1_total_cooldown_time": total_wrong_attempts_p1 * 1.0,  # 1 second per wrong attempt
                "player2_total_cooldown_time": total_wrong_attempts_p2 * 1.0,
                "player1_questions_with_errors": len(self.player1_wrong_answers),
                "player2_questions_with_errors": len(self.player2_wrong_answers)
            },
            "total_questions": len(self.questions),
            "player1_responses": self.player1_responses,
            "player2_responses": self.player2_responses
        }
    
    # Abstract method implementations (required by BaseGame)
    def make_move(self, move: str) -> bool:
        """Not used in trivia - questions are asked automatically"""
        return True
    
    def check_winner(self) -> Optional[int]:
        """Return current winner or None if game not over"""
        return self.winner if self.game_over else None
    
    def get_prompt_for_player(self, player: int) -> str:
        """Not used in trivia - prompts are generated per question"""
        return ""
    
    def is_valid_move(self, move: str) -> bool:
        """All moves are valid in trivia"""
        return True 