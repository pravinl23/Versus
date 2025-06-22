import random
import json
from typing import Dict, List, Tuple, Optional
import asyncio
import sys
import os

# Add the backend directory to path to import from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from src.utils.common import BaseGame, LLMClient

class BattleshipGame(BaseGame):
    def __init__(self, player1_model: str, player2_model: str):
        # Set all attributes BEFORE calling parent init
        self.board_size = 8
        self.ships = {
            "carrier": 4,
            "battleship": 3,
            "destroyer": 3,
            "submarine": 2,
            "patrol": 2
        }
        
        # Create boards BEFORE calling parent init
        self.player1_board = [[None for _ in range(self.board_size)] for _ in range(self.board_size)]
        self.player2_board = [[None for _ in range(self.board_size)] for _ in range(self.board_size)]
        self.player1_shots = [[None for _ in range(self.board_size)] for _ in range(self.board_size)]
        self.player2_shots = [[None for _ in range(self.board_size)] for _ in range(self.board_size)]
        self.player1_ships_remaining = dict(self.ships)
        self.player2_ships_remaining = dict(self.ships)
        
        self.ships_remaining = {1: 14, 2: 14}  # Total ship cells: 4+3+3+2+2 = 14 (updated for 8x8)
        self.ships_placed = {1: False, 2: False}
        self.placement_updates = []  # Track placement updates to send to frontend
        self.player1_model = player1_model
        self.player2_model = player2_model
        self.status = "placement"  # Add status attribute
        self.current_player = 1
        
        # Now call parent constructor which will use our attributes
        super().__init__(player1_model, player2_model)
        
    def initialize_game(self) -> Dict:
        """Initialize game boards and place ships"""
        return {
            'player1_board': self.player1_board,
            'player2_board': self.player2_board,
            'player1_shots': self.player1_shots,
            'player2_shots': self.player2_shots,
            'player1_ships_placed': False,
            'player2_ships_placed': False,
            'turn_count': 0,
            'last_moves': [],
            'ships_remaining': self.ships_remaining,
            'ships_placed': self.ships_placed,
            'placement_updates': self.placement_updates
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
            for ship_name, ship_size in self.ships.items():
                placed = False
                attempts = 0
                
                while not placed and attempts < 100:
                    row = random.randint(0, self.board_size - 1)
                    col = random.randint(0, self.board_size - 1)
                    orientation = random.choice(['horizontal', 'vertical'])
                    
                    if self._can_place_ship(board, row, col, ship_size, orientation):
                        ship_data = {
                            'id': ship_name,
                            'row': row,
                            'col': col,
                            'size': ship_size,
                            'orientation': orientation
                        }
                        self._place_ship_on_board(board, ship_data)
                        placed = True
                        
                        # Track placement update
                        self.placement_updates.append({
                            'player': player,
                            'ship': ship_name,
                            'size': ship_size,
                            'position': {'row': row, 'col': col},
                            'orientation': orientation
                        })
                    
                    attempts += 1
        
        self.game_state[f'player{player}_ships_placed'] = True
        self.ships_placed[player] = True
    
    def place_ship(self, player: int, ship_data: Dict):
        """Place a single ship on the board"""
        board_key = f'player{player}_board'
        board = self.game_state[board_key]
        
        # Place the ship on the board
        self._place_ship_on_board(board, ship_data)
        
        # Update placement tracking
        self.placement_updates.append({
            'player': player,
            'ship': ship_data['id'],
            'size': ship_data['size'],
            'position': {'row': ship_data['row'], 'col': ship_data['col']},
            'orientation': ship_data['orientation']
        })
        
        # Check if all ships are placed for this player
        ships_on_board = 0
        for row in board:
            for cell in row:
                if cell is not None:
                    ships_on_board += 1
        
        # If we have placed all 14 ship cells (4+3+3+2+2), mark as complete
        if ships_on_board == 14:
            self.game_state[f'player{player}_ships_placed'] = True
            self.ships_placed[player] = True
    
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
    
    def make_move(self, row: int, col: int) -> Dict:
        """Process a shot at coordinates"""
        try:
            if not (0 <= row < self.board_size and 0 <= col < self.board_size):
                return {"success": False, "result": "invalid", "reason": "Coordinates out of bounds"}
                
            # Get boards
            shots_key = f'player{self.current_player}_shots'
            opponent_board_key = f'player{3-self.current_player}_board'
            
            # Check if already shot here
            if self.game_state[shots_key][row][col] is not None:
                return {"success": False, "result": "already_shot", "reason": f"Already shot at {chr(col + ord('A'))}{row + 1}"}
            
            # Check if hit or miss
            target_cell = self.game_state[opponent_board_key][row][col]
            if target_cell:
                self.game_state[shots_key][row][col] = 'hit'
                result = 'hit'
                # Update remaining ships for the opponent
                opponent = 3 - self.current_player
                self.ships_remaining[opponent] -= 1
            else:
                self.game_state[shots_key][row][col] = 'miss'
                result = 'miss'
            
            # Add to move history
            col_letter = chr(col + ord('A'))
            move_str = f"{col_letter}{row + 1}"
            self.game_state['last_moves'].append({
                'player': self.current_player,
                'move': move_str,
                'result': result
            })
            
            self.game_state['turn_count'] += 1
            
            # Check for winner
            self.winner = self.check_winner()
            
            # Switch player if no winner
            if not self.winner:
                self.switch_player()
            
            return {"success": True, "result": result, "move": move_str}
            
        except Exception as e:
            print(f"Error in make_move: {e}")
            return {"success": False, "result": "error", "reason": str(e)}
    
    def check_winner(self) -> Optional[int]:
        """Check if someone has won"""
        if self.ships_remaining[1] == 0:
            return 2  # Player 2 wins if Player 1 has no ships left
        elif self.ships_remaining[2] == 0:
            return 1  # Player 1 wins if Player 2 has no ships left
        return None
    
    def get_prompt_for_player(self, player: int) -> str:
        """Generate prompt for LLM to make a move"""
        shots = self.game_state[f'player{player}_shots']
        
        # Find all available positions
        available_positions = []
        for i in range(self.board_size):
            for j in range(self.board_size):
                if shots[i][j] is None:
                    col_letter = chr(j + ord('A'))
                    available_positions.append(f"{col_letter}{i + 1}")
        
        # If no positions available, something is wrong
        if not available_positions:
            return "No positions available. Game should be over."
        
        # Create a simple board visualization
        board_str = "Your shots so far:\n"
        board_str += "   A B C D E F G H\n"
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
        
        # Find hits with unexplored adjacent cells for strategic targeting
        strategic_targets = []
        for i in range(self.board_size):
            for j in range(self.board_size):
                if shots[i][j] == 'hit':
                    # Check adjacent cells
                    for di, dj in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                        ni, nj = i + di, j + dj
                        if 0 <= ni < self.board_size and 0 <= nj < self.board_size:
                            if shots[ni][nj] is None:
                                col_letter = chr(nj + ord('A'))
                                strategic_targets.append(f"{col_letter}{ni + 1}")
        
        # Remove duplicates from strategic targets
        strategic_targets = list(set(strategic_targets))
        
        # Pick a position to suggest
        if strategic_targets:
            suggested = strategic_targets[0]  # Suggest first strategic target
            strategy_hint = f"\nRECOMMENDED: Target {suggested} (adjacent to a hit)"
        else:
            # No strategic targets, pick from center area first
            center_positions = []
            for pos in available_positions:
                col = ord(pos[0]) - ord('A')
                row = int(pos[1:]) - 1
                if 2 <= row <= 5 and 2 <= col <= 5:
                    center_positions.append(pos)
            
            if center_positions:
                suggested = center_positions[0]
                strategy_hint = f"\nRECOMMENDED: Target {suggested} (center area)"
            else:
                suggested = available_positions[0]
                strategy_hint = f"\nRECOMMENDED: Target {suggested}"
        
        prompt = f"""You are playing Battleship on an 8x8 grid (A-H, 1-8).

{board_str}

Legend: X = hit, O = miss, . = not yet shot

Available positions: {', '.join(available_positions[:10])}... ({len(available_positions)} total)
{strategy_hint}

IMPORTANT: Reply with ONLY ONE coordinate (e.g., "A5" or "H8"). Nothing else!
Your move:"""
        
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
    
    def get_state(self) -> dict:
        """Return current game state"""
        state = {
            "board_size": self.board_size,
            "current_player": self.current_player,
            "winner": self.winner,
            "player1_shots": self.game_state['player1_shots'],
            "player2_shots": self.game_state['player2_shots'],
            "ships_remaining": self.ships_remaining,
            "status": self.status,
            "placement_updates": self.placement_updates,  # Include placement updates
            "ships_placed": self.game_state[f'player{self.current_player}_ships_placed']
        }
        
        # Include ship positions only during placement phase or if game is over
        if self.status == "placement" or self.winner:
            state["player1_ships"] = self.game_state['player1_board']
            state["player2_ships"] = self.game_state['player2_board']
        
        return state 