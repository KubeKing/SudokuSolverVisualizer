import numpy as np
import random
import copy
from typing import List, Tuple, Optional, Set

class SudokuBoard:
    """
    A class to represent a Sudoku board and its operations.
    """
    
    def __init__(self, board: Optional[np.ndarray] = None):
        """
        Initialize a Sudoku board.
        
        Args:
            board: A 9x9 numpy array representing the Sudoku board. 0s represent empty cells.
                  If None, an empty board is created.
        """
        if board is None:
            self.board = np.zeros((9, 9), dtype=np.int32)
        else:
            assert board.shape == (9, 9), "Board must be 9x9"
            self.board = board.astype(np.int32)
        
        # Keep track of the original puzzle for visualization
        self.original_board = self.board.copy()
        
        # Track solving steps for visualization
        self.steps = []
    
    def get_board(self) -> np.ndarray:
        """Return the current state of the board."""
        return self.board
    
    def get_original_board(self) -> np.ndarray:
        """Return the original board."""
        return self.original_board
    
    def get_steps(self) -> List[np.ndarray]:
        """Return the steps taken to solve the board."""
        return self.steps
    
    def set_value(self, row: int, col: int, value: int) -> bool:
        """
        Set the value of a cell if it's valid.
        
        Args:
            row: Row index (0-8)
            col: Column index (0-8)
            value: Value to set (1-9)
            
        Returns:
            True if the value was set, False otherwise
        """
        if not self.is_valid_move(row, col, value):
            return False
        
        self.board[row, col] = value
        self.steps.append(self.board.copy())
        return True
    
    def clear_cell(self, row: int, col: int) -> None:
        """Clear a cell by setting it to 0."""
        self.board[row, col] = 0
        self.steps.append(self.board.copy())
    
    def is_valid_move(self, row: int, col: int, value: int) -> bool:
        """
        Check if placing a value at a specific position is valid.
        
        Args:
            row: Row index (0-8)
            col: Column index (0-8)
            value: Value to check (1-9)
            
        Returns:
            True if the move is valid, False otherwise
        """
        # Check row
        if value in self.board[row, :]:
            return False
        
        # Check column
        if value in self.board[:, col]:
            return False
        
        # Check 3x3 box
        box_row, box_col = 3 * (row // 3), 3 * (col // 3)
        if value in self.board[box_row:box_row+3, box_col:box_col+3]:
            return False
        
        return True
    
    def get_empty_cells(self) -> List[Tuple[int, int]]:
        """
        Get a list of empty cells in the board.
        
        Returns:
            List of (row, col) tuples representing empty cells
        """
        empty_cells = []
        for row in range(9):
            for col in range(9):
                if self.board[row, col] == 0:
                    empty_cells.append((row, col))
        return empty_cells
    
    def is_complete(self) -> bool:
        """
        Check if the board is complete (no empty cells).
        
        Returns:
            True if the board is complete, False otherwise
        """
        return len(self.get_empty_cells()) == 0
    
    def is_valid(self) -> bool:
        """
        Check if the current board configuration is valid.
        
        Returns:
            True if the board is valid, False otherwise
        """
        # Check rows
        for row in range(9):
            row_values = [v for v in self.board[row, :] if v != 0]
            if len(row_values) != len(set(row_values)):
                return False
        
        # Check columns
        for col in range(9):
            col_values = [v for v in self.board[:, col] if v != 0]
            if len(col_values) != len(set(col_values)):
                return False
        
        # Check 3x3 boxes
        for box_row in range(0, 9, 3):
            for box_col in range(0, 9, 3):
                box_values = [
                    v for v in self.board[box_row:box_row+3, box_col:box_col+3].flatten() 
                    if v != 0
                ]
                if len(box_values) != len(set(box_values)):
                    return False
        
        return True
    
    def get_valid_moves(self, row: int, col: int) -> Set[int]:
        """
        Get all valid values for a specific cell.
        
        Args:
            row: Row index (0-8)
            col: Column index (0-8)
        
        Returns:
            Set of valid values (1-9)
        """
        valid_moves = set()
        for value in range(1, 10):
            if self.is_valid_move(row, col, value):
                valid_moves.add(value)
        return valid_moves
    
    def get_cell_features(self, row: int, col: int) -> np.ndarray:
        """
        Get features for a specific cell for ML model input.
        Creates a binary encoding for the valid moves at this cell.
        
        Args:
            row: Row index (0-8)
            col: Column index (0-8)
        
        Returns:
            Binary array of length 9 indicating valid moves
        """
        features = np.zeros(9, dtype=np.float32)
        if self.board[row, col] == 0:  # Only compute features for empty cells
            valid_moves = self.get_valid_moves(row, col)
            for value in valid_moves:
                features[value-1] = 1
        else:
            # If the cell is already filled, set the corresponding feature to 1
            features[self.board[row, col]-1] = 1
        
        return features
    
    def to_features(self) -> np.ndarray:
        """
        Convert the board to a feature matrix for ML model input.
        Creates a 9x9x9 tensor, where the last dimension represents the presence of
        a digit (one-hot encoding) or valid moves for empty cells.
        
        Returns:
            A 9x9x9 feature tensor
        """
        features = np.zeros((9, 9, 9), dtype=np.float32)
        
        # Fill in one-hot encoding for filled cells
        for row in range(9):
            for col in range(9):
                if self.board[row, col] > 0:
                    # One-hot encoding for filled cells
                    features[row, col, self.board[row, col]-1] = 1
                else:
                    # For empty cells, encode valid moves
                    valid_moves = self.get_valid_moves(row, col)
                    for value in valid_moves:
                        features[row, col, value-1] = 1
        
        return features
    
    def copy(self) -> 'SudokuBoard':
        """Create a deep copy of the board."""
        new_board = SudokuBoard(self.board.copy())
        new_board.original_board = self.original_board.copy()
        new_board.steps = copy.deepcopy(self.steps)
        return new_board
    
    def to_dict(self) -> dict:
        """Convert board to a dictionary for API responses."""
        return {
            "board": self.board.tolist(),
            "original_board": self.original_board.tolist(),
            "is_complete": self.is_complete(),
            "is_valid": self.is_valid(),
            "steps": [step.tolist() for step in self.steps]
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'SudokuBoard':
        """Create a board from a dictionary."""
        board = cls(np.array(data["board"]))
        board.original_board = np.array(data["original_board"])
        board.steps = [np.array(step) for step in data.get("steps", [])]
        return board
    
    @classmethod
    def from_string(cls, board_str: str) -> 'SudokuBoard':
        """
        Create a board from a string representation.
        The string should be 81 characters long, with each character representing a cell.
        '0' or '.' represents an empty cell.
        
        Args:
            board_str: String representation of the board
        
        Returns:
            SudokuBoard instance
        """
        board_str = board_str.strip().replace('.', '0')
        if len(board_str) != 81:
            raise ValueError("Board string must be exactly 81 characters")
        
        board = np.zeros((9, 9), dtype=np.int32)
        for i, char in enumerate(board_str):
            row, col = i // 9, i % 9
            if char in "123456789":
                board[row, col] = int(char)
        
        return cls(board)
    
    def to_string(self) -> str:
        """
        Convert the board to a string representation.
        
        Returns:
            String representation of the board (81 characters)
        """
        return ''.join(str(int(self.board[i // 9, i % 9])) for i in range(81))
    
    def __str__(self) -> str:
        """String representation of the board for printing."""
        result = ""
        for i, row in enumerate(self.board):
            if i % 3 == 0 and i > 0:
                result += "-" * 21 + "\n"
            
            for j, cell in enumerate(row):
                if j % 3 == 0 and j > 0:
                    result += "| "
                
                if cell == 0:
                    result += ". "
                else:
                    result += str(int(cell)) + " "
            
            result += "\n"
        
        return result