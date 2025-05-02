import numpy as np
from typing import List, Tuple, Optional
import time
from ..models.sudoku_board import SudokuBoard

class BacktrackingSolver:
    """
    A class to solve Sudoku puzzles using the backtracking algorithm.
    """
    
    def __init__(self, visualize: bool = True, max_solutions: int = 1):
        """
        Initialize the solver.
        
        Args:
            visualize: Whether to track steps for visualization
            max_solutions: Maximum number of solutions to find (for uniqueness check)
        """
        self.visualize = visualize
        self.max_solutions = max_solutions
        self.solutions = []
        self.steps_count = 0
        self.backtracks_count = 0
        self.solution_time = 0
    
    def solve(self, board: SudokuBoard) -> Tuple[bool, List[SudokuBoard]]:
        """
        Solve the Sudoku puzzle using backtracking.
        
        Args:
            board: SudokuBoard instance to solve
        
        Returns:
            Tuple of (success, list of solution boards)
        """
        self.solutions = []
        self.steps_count = 0
        self.backtracks_count = 0
        
        start_time = time.time()
        self._solve_recursive(board.copy())
        self.solution_time = time.time() - start_time
        
        return len(self.solutions) > 0, self.solutions
    
    def _solve_recursive(self, board: SudokuBoard) -> bool:
        """
        Recursive helper method for backtracking solver.
        
        Args:
            board: Current board state
        
        Returns:
            True if a solution was found, False otherwise
        """
        self.steps_count += 1
        
        # Check if the board is already complete
        if board.is_complete():
            self.solutions.append(board)
            return True
        
        # Find an empty cell with fewest valid moves (MRV heuristic)
        empty_cells = board.get_empty_cells()
        if not empty_cells:
            return True
        
        # Use minimum remaining values heuristic to choose the next cell
        min_valid_moves = 10
        best_cell = empty_cells[0]
        
        for row, col in empty_cells:
            valid_moves = board.get_valid_moves(row, col)
            if len(valid_moves) < min_valid_moves:
                min_valid_moves = len(valid_moves)
                best_cell = (row, col)
                
                # If we find a cell with only one valid move, use it immediately
                if min_valid_moves == 1:
                    break
        
        row, col = best_cell
        valid_moves = board.get_valid_moves(row, col)
        
        # Try each valid value
        for value in valid_moves:
            # Place the value
            board.set_value(row, col, value)
            
            # Recursively try to solve the rest of the board
            if self._solve_recursive(board.copy()):
                if len(self.solutions) >= self.max_solutions:
                    return True
            
            # If we reach here, the value didn't work
            self.backtracks_count += 1
            board.clear_cell(row, col)
        
        # If we tried all values and none worked, this board is unsolvable
        return False
    
    def get_metrics(self) -> dict:
        """Get solver performance metrics."""
        return {
            "solution_found": len(self.solutions) > 0,
            "solutions_count": len(self.solutions),
            "steps": self.steps_count,
            "backtracks": self.backtracks_count,
            "time_seconds": self.solution_time
        }
    
    def has_unique_solution(self, board: SudokuBoard) -> bool:
        """
        Check if a Sudoku puzzle has a unique solution.
        
        Args:
            board: SudokuBoard instance to check
        
        Returns:
            True if the puzzle has exactly one solution, False otherwise
        """
        # Set max_solutions to 2 to stop after finding a second solution
        solver = BacktrackingSolver(visualize=False, max_solutions=2)
        solver.solve(board)
        return len(solver.solutions) == 1
    
    def generate_puzzle(self, difficulty: str = "medium") -> SudokuBoard:
        """
        Generate a Sudoku puzzle with a unique solution.
        The difficulty determines how many cells are initially filled.
        
        Args:
            difficulty: Difficulty level - 'easy', 'medium', 'hard', or 'expert'
        
        Returns:
            SudokuBoard instance with the generated puzzle
        """
        # Start with an empty board
        board = SudokuBoard()
        
        # Fill the diagonal 3x3 boxes, which can be filled independently
        for i in range(0, 9, 3):
            self._fill_box(board, i, i)
        
        # Solve the board completely
        self.solve(board)
        if not self.solutions:
            # This should never happen since we're starting with a valid partially filled board
            raise RuntimeError("Failed to generate a solved board")
        
        # Get the solved board
        solved_board = self.solutions[0]
        
        # Now remove cells while ensuring the puzzle still has a unique solution
        filled_cells = [(row, col) for row in range(9) for col in range(9)]
        np.random.shuffle(filled_cells)
        
        # Determine how many cells to remove based on difficulty
        if difficulty == "easy":
            cells_to_remove = 40  # ~41 cells filled
        elif difficulty == "medium":
            cells_to_remove = 50  # ~31 cells filled
        elif difficulty == "hard":
            cells_to_remove = 55  # ~26 cells filled
        elif difficulty == "expert":
            cells_to_remove = 60  # ~21 cells filled
        else:
            raise ValueError(f"Unknown difficulty level: {difficulty}")
        
        # Create a copy of the solved board to remove cells from
        puzzle_board = solved_board.copy()
        removed = 0
        
        for row, col in filled_cells:
            # Save the current value
            temp = puzzle_board.board[row, col]
            puzzle_board.board[row, col] = 0
            
            # Check if the puzzle still has a unique solution
            if not self.has_unique_solution(puzzle_board):
                # If not, restore the value
                puzzle_board.board[row, col] = temp
            else:
                removed += 1
                
            # Stop if we've removed enough cells
            if removed >= cells_to_remove:
                break
        
        # Reset the original board and steps
        puzzle_board.original_board = puzzle_board.board.copy()
        puzzle_board.steps = []
        
        return puzzle_board
    
    def _fill_box(self, board: SudokuBoard, start_row: int, start_col: int) -> None:
        """
        Fill a 3x3 box with random valid values.
        
        Args:
            board: SudokuBoard instance
            start_row: Starting row of the box
            start_col: Starting column of the box
        """
        values = list(range(1, 10))
        np.random.shuffle(values)
        
        for i in range(3):
            for j in range(3):
                board.board[start_row + i, start_col + j] = values.pop()