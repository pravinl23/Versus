import random
import json
from typing import Dict, List, Tuple, Optional
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import BaseGame, LLMClient

class BattleshipGame(BaseGame):
    def __init__(self, player1_model: str, player2_model: str):
        super().__init__(player1_model, player2_model)
        self.board_size = 10
        self.ships = [
            {'name': 'Carrier', 'size': 5, 'id': 'carrier'},
            {'name': 'Battleship', 'size': 4, 'id': 'battleship'},
            {'name': 'Cruiser', 'size': 3, 'id': 'cruiser'},
            {'name': 'Submarine', 'size': 3, 'id': 'submarine'},
            {'name': 'Destroyer', 'size': 2, 'id': 'destroyer'}
        ]
        self.player1_remaining_ships = sum(ship['size'] for ship in self.ships)
        self.player2_remaining_ships = sum(ship['size'] for ship in self.ships)
        
    def initialize_game(self) -> Dict:
        """Initialize game boards and place ships"""
        return {
            'player1_board': self._create_empty_board(),
            'player2_board': self._create_empty_board(),
            'player1_shots': self._create_empty_board(),
            'player2_shots': self._create_empty_board(),
            'player1_ships_placed': False,
            'player2_ships_placed': False,
            'turn_count': 0,
            'last_moves': []
        }
    
    def _create_empty_board(self):
        return [[None for _ in range(self.board_size)] for _ in range(self.board_size)]
    
    def place_ships_for_player(self, player: int, ships_data: List[Dict] = None):
        """Place ships on the board for a player"""
        board_key = f'player{player}_board'
        board = self.game_state[board_key]
        
        if ships_data:
            # Use provided ship placement
            for ship in ships_data:
                self._place_ship_on_board(board, ship)
        else:
            # AI places ships randomly
            for ship in self.ships:
                placed = False
                attempts = 0
                while not placed and attempts < 100:
                    row = random.randint(0, self.board_size - 1)
                    col = random.randint(0, self.board_size - 1)
                    orientation = random.choice(['horizontal', 'vertical'])
                    
                    if self._can_place_ship(board, row, col, ship['size'], orientation):
                        ship_data = {
                            'id': ship['id'],
                            'row': row,
                            'col': col,
                            'size': ship['size'],
                            'orientation': orientation
                        }
                        self._place_ship_on_board(board, ship_data)
                        placed = True
                    attempts += 1
        
        self.game_state[f'player{player}_ships_placed'] = True
    
    def _can_place_ship(self, board, row, col, size, orientation):
        """Check if ship can be placed at position"""
        if orientation == 'horizontal':
            if col + size > self.board_size:
                return False
            for i in range(size):
                if board[row][col + i] is not None:
                    return False
        else:
            if row + size > self.board_size:
                return False
            for i in range(size):
                if board[row + i][col] is not None:
                    return False
        return True
    
    def _place_ship_on_board(self, board, ship_data):
        """Place a ship on the board"""
        row, col = ship_data['row'], ship_data['col']
        size = ship_data['size']
        ship_id = ship_data['id']
        
        if ship_data['orientation'] == 'horizontal':
            for i in range(size):
                board[row][col + i] = ship_id
        else:
            for i in range(size):
                board[row + i][col] = ship_id
    
    def make_move(self, move: str) -> bool:
        """Process a shot at coordinates"""
        # Parse move (e.g., "A5" -> row=4, col=0)
        try:
            col = ord(move[0].upper()) - ord('A')
            row = int(move[1:]) - 1
            
            if not (0 <= row < self.board_size and 0 <= col < self.board_size):
                return False
                
            # Get boards
            shots_key = f'player{self.current_player}_shots'
            opponent_board_key = f'player{3-self.current_player}_board'
            
            # Check if already shot here
            if self.game_state[shots_key][row][col] is not None:
                return False
            
            # Check if hit or miss
            target_cell = self.game_state[opponent_board_key][row][col]
            if target_cell:
                self.game_state[shots_key][row][col] = 'hit'
                # Update remaining ships
                if self.current_player == 1:
                    self.player2_remaining_ships -= 1
                else:
                    self.player1_remaining_ships -= 1
            else:
                self.game_state[shots_key][row][col] = 'miss'
            
            # Add to move history
            self.game_state['last_moves'].append({
                'player': self.current_player,
                'move': move,
                'result': self.game_state[shots_key][row][col]
            })
            
            self.game_state['turn_count'] += 1
            return True
            
        except:
            return False
    
    def check_winner(self) -> Optional[int]:
        """Check if someone has won"""
        if self.player1_remaining_ships == 0:
            return 2
        elif self.player2_remaining_ships == 0:
            return 1
        return None
    
    def get_prompt_for_player(self, player: int) -> str:
        """Generate prompt for LLM to make a move"""
        shots = self.game_state[f'player{player}_shots']
        
        # Create a visual representation of the target board
        board_str = "   A B C D E F G H I J\n"
        for i in range(self.board_size):
            board_str += f"{i+1:2} "
            for j in range(self.board_size):
                if shots[i][j] == 'hit':
                    board_str += "X "
                elif shots[i][j] == 'miss':
                    board_str += "O "
                else:
                    board_str += ". "
            board_str += "\n"
        
        # Get recent moves
        recent_moves = self.game_state['last_moves'][-10:]
        moves_str = "\n".join([f"Move {m['move']}: {m['result']}" for m in recent_moves if m['player'] == player])
        
        prompt = f"""You are playing Battleship. You need to sink all enemy ships.

Your target board (X = hit, O = miss, . = unknown):
{board_str}

Your recent moves:
{moves_str}

Ships in the game: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)

Make your next shot. Respond with ONLY the coordinates (e.g., "A5", "J10").
Think strategically: if you have hits, try to sink the ship by targeting adjacent cells."""
        
        return prompt
    
    def is_valid_move(self, move: str) -> bool:
        """Check if move format is valid"""
        if not move or len(move) < 2:
            return False
        
        # Check format (letter + number)
        if not move[0].isalpha() or not move[1:].isdigit():
            return False
            
        col = ord(move[0].upper()) - ord('A')
        row = int(move[1:]) - 1
        
        # Check bounds
        if not (0 <= row < self.board_size and 0 <= col < self.board_size):
            return False
            
        # Check if already shot here
        shots = self.game_state[f'player{self.current_player}_shots']
        if shots[row][col] is not None:
            return False
            
        return True 