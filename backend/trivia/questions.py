"""
Trivia Question Bank for VERSUS platform
Contains 20 pre-defined trivia questions with answers
"""

TRIVIA_QUESTIONS = [
    {
        "id": 1,
        "question": "What is the capital of Australia?",
        "choices": ["Sydney", "Melbourne", "Canberra", "Perth"],
        "correct_answer": "C",
        "correct_answer_text": "Canberra",
        "category": "Geography"
    },
    {
        "id": 2,
        "question": "Who wrote the novel '1984'?",
        "choices": ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Kurt Vonnegut"],
        "correct_answer": "B",
        "correct_answer_text": "George Orwell",
        "category": "Literature"
    },
    {
        "id": 3,
        "question": "What is the chemical symbol for gold?",
        "choices": ["Go", "Gd", "Au", "Ag"],
        "correct_answer": "C",
        "correct_answer_text": "Au",
        "category": "Science"
    },
    {
        "id": 4,
        "question": "In which year did World War II end?",
        "choices": ["1944", "1945", "1946", "1947"],
        "correct_answer": "B",
        "correct_answer_text": "1945",
        "category": "History"
    },
    {
        "id": 5,
        "question": "What is the largest planet in our solar system?",
        "choices": ["Saturn", "Jupiter", "Neptune", "Uranus"],
        "correct_answer": "B",
        "correct_answer_text": "Jupiter",
        "category": "Science"
    },
    {
        "id": 6,
        "question": "Which artist painted 'The Starry Night'?",
        "choices": ["Pablo Picasso", "Vincent van Gogh", "Claude Monet", "Salvador Dalí"],
        "correct_answer": "B",
        "correct_answer_text": "Vincent van Gogh",
        "category": "Art"
    },
    {
        "id": 7,
        "question": "What is the smallest country in the world?",
        "choices": ["Monaco", "Nauru", "Vatican City", "San Marino"],
        "correct_answer": "C",
        "correct_answer_text": "Vatican City",
        "category": "Geography"
    },
    {
        "id": 8,
        "question": "How many chambers does a human heart have?",
        "choices": ["2", "3", "4", "5"],
        "correct_answer": "C",
        "correct_answer_text": "4",
        "category": "Science"
    },
    {
        "id": 9,
        "question": "Which programming language was created by Guido van Rossum?",
        "choices": ["Java", "C++", "Python", "JavaScript"],
        "correct_answer": "C",
        "correct_answer_text": "Python",
        "category": "Technology"
    },
    {
        "id": 10,
        "question": "What is the currency of Japan?",
        "choices": ["Won", "Yuan", "Yen", "Ringgit"],
        "correct_answer": "C",
        "correct_answer_text": "Yen",
        "category": "Geography"
    },
    {
        "id": 11,
        "question": "Who composed 'The Four Seasons'?",
        "choices": ["Mozart", "Beethoven", "Vivaldi", "Bach"],
        "correct_answer": "C",
        "correct_answer_text": "Vivaldi",
        "category": "Music"
    },
    {
        "id": 12,
        "question": "What does 'HTTP' stand for?",
        "choices": ["Hypertext Transfer Protocol", "High Tech Transfer Protocol", "Hyperlink Text Protocol", "Home Tool Transfer Protocol"],
        "correct_answer": "A",
        "correct_answer_text": "Hypertext Transfer Protocol",
        "category": "Technology"
    },
    {
        "id": 13,
        "question": "Which element has the atomic number 1?",
        "choices": ["Helium", "Hydrogen", "Lithium", "Carbon"],
        "correct_answer": "B",
        "correct_answer_text": "Hydrogen",
        "category": "Science"
    },
    {
        "id": 14,
        "question": "In Greek mythology, who is the king of the gods?",
        "choices": ["Apollo", "Poseidon", "Hades", "Zeus"],
        "correct_answer": "D",
        "correct_answer_text": "Zeus",
        "category": "Mythology"
    },
    {
        "id": 15,
        "question": "What is the longest river in the world?",
        "choices": ["Amazon River", "Nile River", "Mississippi River", "Yangtze River"],
        "correct_answer": "B",
        "correct_answer_text": "Nile River",
        "category": "Geography"
    },
    {
        "id": 16,
        "question": "Which company developed the iPhone?",
        "choices": ["Google", "Microsoft", "Apple", "Samsung"],
        "correct_answer": "C",
        "correct_answer_text": "Apple",
        "category": "Technology"
    },
    {
        "id": 17,
        "question": "What is the formula for water?",
        "choices": ["CO2", "H2O", "NaCl", "CH4"],
        "correct_answer": "B",
        "correct_answer_text": "H2O",
        "category": "Science"
    },
    {
        "id": 18,
        "question": "Which Shakespeare play features the character Hamlet?",
        "choices": ["Macbeth", "Romeo and Juliet", "Hamlet", "Othello"],
        "correct_answer": "C",
        "correct_answer_text": "Hamlet",
        "category": "Literature"
    },
    {
        "id": 19,
        "question": "What is the speed of light in vacuum?",
        "choices": ["300,000 km/s", "299,792,458 m/s", "186,000 mph", "All of the above"],
        "correct_answer": "B",
        "correct_answer_text": "299,792,458 m/s",
        "category": "Science"
    },
    {
        "id": 20,
        "question": "Which year was the first iPhone released?",
        "choices": ["2006", "2007", "2008", "2009"],
        "correct_answer": "B",
        "correct_answer_text": "2007",
        "category": "Technology"
    }
]

def get_random_questions(count: int = 20) -> list:
    """Get a random selection of questions"""
    import random
    if count >= len(TRIVIA_QUESTIONS):
        return TRIVIA_QUESTIONS.copy()
    return random.sample(TRIVIA_QUESTIONS, count)

def get_questions_by_category(category: str) -> list:
    """Get questions filtered by category"""
    return [q for q in TRIVIA_QUESTIONS if q["category"].lower() == category.lower()]

def get_all_categories() -> list:
    """Get all available categories"""
    return list(set(q["category"] for q in TRIVIA_QUESTIONS)) 