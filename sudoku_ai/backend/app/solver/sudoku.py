"""
Sudoku solver using Dancing Links algorithm.
Converts a Sudoku grid to an exact cover problem and solves it.
"""
from typing import List, Tuple, Dict, Set, Optional
import math
from .dlx import DancingLinks, Column

class SudokuSolver:
    """Sudoku solver using Dancing Links (Algorithm X)."""
    
    def __init__(self, size: int = 9):
        """
        Initialize the Sudoku solver.
        
        Args:
            size: Size of the Sudoku grid (default: 9 for 9x9 puzzle)
        """
        self.size = size
        self.box_size = int(math.sqrt(size))  # 3 for 9x9, 4 for 16x16
        self.dlx = DancingLinks()
        
        # For mapping back from solution to grid
        self.row_col_digit_map = {}
    
    def _create_constraints(self) -> Dict[str, Column]:
        """Create all constraint columns for the DLX matrix."""
        columns = {}
        
        # 1. Cell constraints: each cell must contain exactly one digit
        for r in range(self.size):
            for c in range(self.size):
                col_name = f"cell_r{r}c{c}"
                columns[col_name] = self.dlx.add_column(col_name)
        
        # 2. Row constraints: each digit must appear exactly once in each row
        for r in range(self.size):
            for d in range(1, self.size + 1):
                col_name = f"row_r{r}d{d}"
                columns[col_name] = self.dlx.add_column(col_name)
        
        # 3. Column constraints: each digit must appear exactly once in each column
        for c in range(self.size):
            for d in range(1, self.size + 1):
                col_name = f"col_c{c}d{d}"
                columns[col_name] = self.dlx.add_column(col_name)
        
        # 4. Box constraints: each digit must appear exactly once in each box
        for box_r in range(self.box_size):
            for box_c in range(self.box_size):
                for d in range(1, self.size + 1):
                    box_idx = box_r * self.box_size + box_c
                    col_name = f"box_b{box_idx}d{d}"
                    columns[col_name] = self.dlx.add_column(col_name)
        
        return columns
    
    def build_exact_cover(self, grid: List[List[int]]) -> None:
        """
        Build the exact cover matrix from a Sudoku grid.
        
        Args:
            grid: 2D list representing the Sudoku grid (0 for empty cells)
        """
        columns = self._create_constraints()
        
        # For each possible cell placement (r, c, d), create a row with 4 ones
        for r in range(self.size):
            for c in range(self.size):
                # Calculate which box this cell belongs to
                box_r = r // self.box_size
                box_c = c // self.box_size
                box_idx = box_r * self.box_size + box_c
                
                # If cell has a value, only consider that digit
                # Otherwise, consider all possible digits
                digits = [grid[r][c]] if grid[r][c] != 0 else range(1, self.size + 1)
                
                for d in digits:
                    # Get the four columns this placement satisfies
                    cols = [
                        columns[f"cell_r{r}c{c}"],       # Cell constraint
                        columns[f"row_r{r}d{d}"],        # Row constraint
                        columns[f"col_c{c}d{d}"],        # Column constraint
                        columns[f"box_b{box_idx}d{d}"]   # Box constraint
                    ]
                    
                    # Add this row to the DLX matrix
                    self.dlx.add_row(cols)
                    
                    # Store mapping for solution decoding
                    row_id = (r, c, d)
                    # We'll use the column names to retrieve this row later
                    self.row_col_digit_map[f"cell_r{r}c{c}"] = row_id
    
    def decode_solution(self, solution) -> List[List[int]]:
        """
        Decode a solution from the DLX algorithm back to a Sudoku grid.
        
        Args:
            solution: List of nodes representing a solution from DLX
            
        Returns:
            Completed Sudoku grid
        """
        # Initialize empty grid
        grid = [[0 for _ in range(self.size)] for _ in range(self.size)]
        
        # For each row in the solution
        for row in solution:
            # Find the cell constraint column (always the first one in our encoding)
            cell_col = row.column.name
            
            # Look up the (r, c, d) mapping
            if cell_col in self.row_col_digit_map:
                r, c, d = self.row_col_digit_map[cell_col]
                grid[r][c] = d
        
        return grid
    
    def solve(self, grid: List[List[int]], record_steps: bool = False) -> Tuple[List[List[int]], List[Tuple], Dict]:
        """
        Solve a Sudoku puzzle.
        
        Args:
            grid: 2D list representing the Sudoku grid (0 for empty cells)
            record_steps: Whether to record steps for visualization
            
        Returns:
            Tuple of (solved grid, solving steps, solving stats)
        """
        # Reset the solver
        self.dlx = DancingLinks()
        self.row_col_digit_map = {}
        
        # Build the exact cover matrix
        self.build_exact_cover(grid)
        
        # Solve the exact cover problem
        solutions = self.dlx.solve(record_steps)
        
        if not solutions:
            return None, [], {}
        
        # Decode the first solution
        solved_grid = self.decode_solution(solutions[0])
        
        # Count mistakes (backtracking operations)
        mistakes = 0
        forward_steps = 0
        
        for step_type, _ in self.dlx.steps:
            if step_type == "deselect_row":
                mistakes += 1
            elif step_type == "select_row":
                forward_steps += 1
        
        # Calculate minimum steps (filled cells that weren't given)
        empty_cells = sum(row.count(0) for row in grid)
        minimum_steps = empty_cells
        
        stats = {
            "mistakes": mistakes,
            "steps": forward_steps,
            "minimumSteps": minimum_steps
        }
        
        # Return the solution, steps, and statistics
        return solved_grid, self.dlx.steps, stats
    
    @staticmethod
    def get_solving_visualization(steps, initial_grid: List[List[int]], size: int = 9) -> List[Dict]:
        """
        Convert solving steps to a format suitable for visualization.
        
        Args:
            steps: List of steps from the DLX algorithm
            initial_grid: The initial Sudoku grid
            size: Size of the grid
            
        Returns:
            List of grid states for visualization
        """
        # Initialize with the initial grid
        current_grid = [row[:] for row in initial_grid]
        visualizations = [{"grid": [row[:] for row in current_grid], "step": "initial"}]
        
        placed_cells = set()
        
        for step_type, data in steps:
            if step_type == "select_row" and isinstance(data, list):
                # Find the cell constraint in the row
                cell_col = next((col for col in data if col.startswith("cell_")), None)
                
                if cell_col:
                    # Extract r, c, d from column name
                    parts = cell_col.replace("cell_r", "").split("c")
                    if len(parts) == 2:
                        r = int(parts[0])
                        c_parts = parts[1].split("_")
                        c = int(c_parts[0])
                        
                        # Find the digit from row/col/box constraints
                        d = None
                        for col in data:
                            if col.startswith("row_") and f"r{r}" in col:
                                d_part = col.split("d")[1]
                                d = int(d_part)
                                break
                        
                        if d is not None and (r, c) not in placed_cells:
                            current_grid[r][c] = d
                            placed_cells.add((r, c))
                            
                            # Add this state to visualization
                            visualizations.append({
                                "grid": [row[:] for row in current_grid],
                                "step": f"Place {d} at ({r},{c})",
                                "highlight": (r, c)
                            })
            
            elif step_type == "deselect_row" and hasattr(data, "startswith") and data.startswith("cell_"):
                # When backtracking, we need to remove the placement
                parts = data.replace("cell_r", "").split("c")
                if len(parts) == 2:
                    r = int(parts[0])
                    c = int(parts[1])
                    
                    if (r, c) in placed_cells:
                        placed_cells.remove((r, c))
                        # Only reset if it wasn't in the initial grid
                        if initial_grid[r][c] == 0:
                            current_grid[r][c] = 0
                            
                            # Add this state to visualization
                            visualizations.append({
                                "grid": [row[:] for row in current_grid],
                                "step": f"Backtrack from ({r},{c})",
                                "highlight": (r, c)
                            })
        
        return visualizations

def is_valid_sudoku(grid: List[List[int]], size: int = 9) -> bool:
    """
    Check if a Sudoku grid is valid (no constraint violations).
    
    Args:
        grid: 2D list representing the Sudoku grid
        size: Size of the grid
        
    Returns:
        True if the grid is valid, False otherwise
    """
    box_size = int(math.sqrt(size))
    
    # Check rows
    for r in range(size):
        row_digits = set()
        for c in range(size):
            if grid[r][c] != 0:
                if grid[r][c] in row_digits:
                    return False
                row_digits.add(grid[r][c])
    
    # Check columns
    for c in range(size):
        col_digits = set()
        for r in range(size):
            if grid[r][c] != 0:
                if grid[r][c] in col_digits:
                    return False
                col_digits.add(grid[r][c])
    
    # Check boxes
    for box_r in range(box_size):
        for box_c in range(box_size):
            box_digits = set()
            for r in range(box_r * box_size, (box_r + 1) * box_size):
                for c in range(box_c * box_size, (box_c + 1) * box_size):
                    if grid[r][c] != 0:
                        if grid[r][c] in box_digits:
                            return False
                        box_digits.add(grid[r][c])
    
    return True

import random
import copy

def generate_sudoku(difficulty: str = "medium", size: int = 9) -> List[List[int]]:
    """
    Generate a Sudoku puzzle with the specified difficulty.
    
    Args:
        difficulty: Difficulty level ("easy", "medium", "hard", "expert")
        size: Size of the grid
        
    Returns:
        2D list representing a Sudoku puzzle
    """
    # Define difficulty levels (number of cells to keep filled)
    difficulty_levels = {
        "easy": 45,     # ~36 empty cells
        "medium": 35,   # ~46 empty cells
        "hard": 30,     # ~51 empty cells
        "expert": 25    # ~56 empty cells
    }
    
    # Use medium if specified difficulty doesn't exist
    filled_cells = difficulty_levels.get(difficulty.lower(), difficulty_levels["medium"])
    
    # Generate a solved board
    solved_board = _generate_solved_board(size)
    
    # Create a copy to work with
    puzzle = copy.deepcopy(solved_board)
    
    # Get all cell positions
    positions = [(r, c) for r in range(size) for c in range(size)]
    random.shuffle(positions)
    
    # Keep track of removed positions for backtracking
    removed_positions = []
    
    # Remove numbers while ensuring unique solution
    solver = SudokuSolver(size)
    
    for r, c in positions:
        # Skip if we've reached our target number of filled cells
        if len(positions) - len(removed_positions) <= filled_cells:
            break
            
        # Remember the value
        temp = puzzle[r][c]
        puzzle[r][c] = 0
        removed_positions.append((r, c, temp))
        
        # Check if still has unique solution
        # For performance, we check after removing a batch of cells
        if len(removed_positions) % 5 == 0:
            # Make a copy for testing
            test_puzzle = copy.deepcopy(puzzle)
            
            # Count solutions (up to 2)
            solutions = _count_solutions(test_puzzle, size, max_count=2)
            
            # If not unique, restore last batch of removed cells
            if solutions != 1:
                for i in range(min(5, len(removed_positions))):
                    rr, cc, val = removed_positions.pop()
                    puzzle[rr][cc] = val
    
    return puzzle

def _generate_solved_board(size: int = 9) -> List[List[int]]:
    """
    Generate a completely solved Sudoku board.
    
    Args:
        size: Size of the grid
        
    Returns:
        2D list representing a solved Sudoku grid
    """
    board = [[0 for _ in range(size)] for _ in range(size)]
    box_size = int(math.sqrt(size))
    
    # Fill the board using backtracking
    def _is_valid(board, row, col, num):
        # Check row
        for x in range(size):
            if board[row][x] == num:
                return False
        
        # Check column
        for x in range(size):
            if board[x][col] == num:
                return False
        
        # Check box
        start_row, start_col = box_size * (row // box_size), box_size * (col // box_size)
        for r in range(start_row, start_row + box_size):
            for c in range(start_col, start_col + box_size):
                if board[r][c] == num:
                    return False
        
        return True
    
    def _solve_board(board):
        for row in range(size):
            for col in range(size):
                if board[row][col] == 0:
                    # Try digits 1-9 in random order
                    nums = list(range(1, size + 1))
                    random.shuffle(nums)
                    
                    for num in nums:
                        if _is_valid(board, row, col, num):
                            board[row][col] = num
                            
                            if _solve_board(board):
                                return True
                            
                            board[row][col] = 0
                    
                    return False
        return True
    
    _solve_board(board)
    return board

def _count_solutions(grid: List[List[int]], size: int = 9, max_count: int = 1) -> int:
    """
    Count the number of solutions for a Sudoku puzzle, up to max_count.
    
    Args:
        grid: 2D list representing the Sudoku puzzle
        size: Size of the grid
        max_count: Maximum number of solutions to find before stopping
        
    Returns:
        Number of solutions (stops counting at max_count)
    """
    box_size = int(math.sqrt(size))
    solutions = [0]  # Use a list for mutable closure
    
    def _is_valid(row, col, num):
        # Check row
        for x in range(size):
            if grid[row][x] == num:
                return False
        
        # Check column
        for x in range(size):
            if grid[x][col] == num:
                return False
        
        # Check box
        start_row, start_col = box_size * (row // box_size), box_size * (col // box_size)
        for r in range(start_row, start_row + box_size):
            for c in range(start_col, start_col + box_size):
                if grid[r][c] == num:
                    return False
        
        return True
    
    def _backtrack():
        if solutions[0] >= max_count:
            return
            
        # Find an empty cell
        row, col = -1, -1
        for r in range(size):
            for c in range(size):
                if grid[r][c] == 0:
                    row, col = r, c
                    break
            if row != -1:
                break
        
        # No empty cell means we found a solution
        if row == -1:
            solutions[0] += 1
            return
        
        # Try each valid number
        for num in range(1, size + 1):
            if _is_valid(row, col, num):
                grid[row][col] = num
                _backtrack()
                grid[row][col] = 0  # Backtrack
                
                # If we've reached max_count, stop
                if solutions[0] >= max_count:
                    return
    
    _backtrack()
    return solutions[0]
