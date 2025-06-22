"""
Trivia Question Bank for VERSUS platform
Loads questions from JSON file and provides random selection
"""

import json
import random
import os
from typing import List, Dict

def load_trivia_questions() -> List[Dict]:
    """Load trivia questions from JSON file"""
    # Get the directory of this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    json_file_path = os.path.join(current_dir, "trivia_questions.json")
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            questions_data = json.load(f)
        
        # Convert JSON format to trivia game format
        converted_questions = []
        for q in questions_data:
            # Extract choices in order A, B, C, D
            choices = [
                q["options"]["A"],
                q["options"]["B"], 
                q["options"]["C"],
                q["options"]["D"]
            ]
            
            # Get correct answer text
            correct_answer_text = q["options"][q["answer"]]
            
            converted_question = {
                "id": q["id"],
                "question": q["question"],
                "choices": choices,
                "correct_answer": q["answer"],  # A, B, C, or D
                "correct_answer_text": correct_answer_text,
                "category": "Mixed"  # You can add categories later if needed
            }
            converted_questions.append(converted_question)
        
        return converted_questions
        
    except FileNotFoundError:
        print(f"Warning: trivia_questions.json not found at {json_file_path}")
        return []
    except Exception as e:
        print(f"Error loading trivia questions: {e}")
        return []

# Load all questions from JSON
ALL_TRIVIA_QUESTIONS = load_trivia_questions()

def get_random_questions(count: int = 20) -> List[Dict]:
    """Get a random selection of questions from the full question bank"""
    if not ALL_TRIVIA_QUESTIONS:
        print("Warning: No questions loaded, returning empty list")
        return []
    
    if count >= len(ALL_TRIVIA_QUESTIONS):
        # If asking for more questions than available, return all questions shuffled
        questions = ALL_TRIVIA_QUESTIONS.copy()
        random.shuffle(questions)
        return questions
    
    # Return random sample of requested count
    return random.sample(ALL_TRIVIA_QUESTIONS, count)

def get_questions_by_category(category: str) -> List[Dict]:
    """Get questions filtered by category"""
    return [q for q in ALL_TRIVIA_QUESTIONS if q["category"].lower() == category.lower()]

def get_all_categories() -> List[str]:
    """Get all available categories"""
    return list(set(q["category"] for q in ALL_TRIVIA_QUESTIONS))

# For backwards compatibility, expose the questions
TRIVIA_QUESTIONS = get_random_questions(20)  # Default 20 random questions 