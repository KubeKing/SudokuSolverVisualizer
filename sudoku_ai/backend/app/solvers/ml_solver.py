import torch
import numpy as np
import time
from typing import Tuple, List, Optional

from ..models.sudoku_board import SudokuBoard
from ..models.cnn_model import SudokuCNN

class MLSolver:
    """
    A class to solve Sudoku puzzles using a trained neural network.
    This solver can use either pure prediction or prediction with backtracking.
    """
    
    def __init__(self, 
                model_path: str,
                device: Optional[str] = None,
                use_backtracking: bool = True):
        """
        Initialize the ML solver.
        
        Args:
            model_path: Path to the trained model
            device: Device to run the model on ('cuda' or 'cpu')
            use_backtracking: Whether to use backtracking to clean up the predictions
        """
        # Determine device
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)
        
        print(f"Using device: {self.device}")
        
        # Load model
        self.model = SudokuCNN()
        checkpoint = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()
        
        # Solver settings
        self.use_backtracking = use_backtracking
        
        # Performance metrics
        self.solution_time = 0
        self.prediction_steps = 0
        self.backtracking_steps = 0
    
    def solve(self, board: SudokuBoard) -> Tuple[bool, List[SudokuBoard]]:
        """
        Solve a Sudoku puzzle using the neural network.
        
        Args:
            board: SudokuBoard instance to solve
        
        Returns:
            Tuple of (success, list of solution boards)
        """
        start_time = time.time()
        self.prediction_steps = 0
        self.backtracking_steps = 0
        
        # Make a copy of the board to work with
        solution_board = board.copy()
        solution_board.steps = [solution_board.board.copy()]
        
        # First phase: Fill in cells using pure prediction
        filled_board = self._predict_solution(solution_board)
        
        # Check if the solution is valid
        success = filled_board.is_complete() and filled_board.is_valid()
        
        # Second phase: Use backtracking to fix any remaining issues
        if not success and self.use_backtracking:
            success, fixed_board = self._backtracking_cleanup(filled_board)
            if success:
                filled_board = fixed_board
        
        self.solution_time = time.time() - start_time
        
        return success, [filled_board] if success else []
    
    def _predict_solution(self, board: SudokuBoard) -> SudokuBoard:
        """
        Fill in the board using pure CNN predictions.
        
        Args:
            board: SudokuBoard instance to fill
        
        Returns:
            The filled board
        """
        # Create a copy of the board to modify
        solution_board = board.copy()
        
        # Get empty cells
        empty_cells = solution_board.get_empty_cells()
        if not empty_cells:
            return solution_board
        
        # While there are still empty cells
        while empty_cells:
            # Prepare input tensor
            inputs = torch.zeros((1, 9, 9, 9), dtype=torch.float32, device=self.device)
            
            # Fill input with one-hot encoding of the board
            for row in range(9):
                for col in range(9):
                    value = solution_board.board[row, col]
                    if value > 0:
                        # One-hot encoding for filled cells
                        inputs[0, row, col, value-1] = 1
                    else:
                        # For empty cells, mark all valid moves
                        valid_moves = solution_board.get_valid_moves(row, col)
                        for v in valid_moves:
                            inputs[0, row, col, v-1] = 1
            
            # Get model predictions
            with torch.no_grad():
                outputs = self.model(inputs)
            
            # Find the cell with the highest confidence prediction
            max_confidence = -1
            best_cell = None
            best_value = None
            
            for row, col in empty_cells:
                # Get predictions for this cell
                cell_preds = outputs[0, row, col].cpu().numpy()
                
                # Find the value with the highest confidence
                value = np.argmax(cell_preds) + 1  # Convert from 0-8 to 1-9
                confidence = cell_preds[value-1]
                
                # Check if this is a valid move
                if solution_board.is_valid_move(row, col, value) and confidence > max_confidence:
                    max_confidence = confidence
                    best_cell = (row, col)
                    best_value = value
            
            # If we found a valid move, apply it
            if best_cell is not None:
                row, col = best_cell
                solution_board.set_value(row, col, best_value)
                self.prediction_steps += 1
                
                # Update empty cells
                empty_cells = solution_board.get_empty_cells()
            else:
                # If we can't find a valid move, break out
                break
        
        return solution_board
    
    def _backtracking_cleanup(self, board: SudokuBoard) -> Tuple[bool, SudokuBoard]:
        """
        Use backtracking to fix any remaining issues with the board.
        
        Args:
            board: Partially filled SudokuBoard instance
        
        Returns:
            Tuple of (success, fixed board)
        """
        # Create a copy of the board to modify
        solution_board = board.copy()
        
        # Use recursive backtracking to solve the remaining empty cells
        success = self._backtracking_recursive(solution_board)
        
        return success, solution_board
    
    def _backtracking_recursive(self, board: SudokuBoard) -> bool:
        """
        Recursive helper method for backtracking cleanup.
        
        Args:
            board: Current board state
        
        Returns:
            True if a solution was found, False otherwise
        """
        self.backtracking_steps += 1
        
        # Check if the board is already complete
        if board.is_complete():
            return board.is_valid()
        
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
            if self._backtracking_recursive(board):
                return True
            
            # If we reach here, the value didn't work
            board.clear_cell(row, col)
        
        # If we tried all values and none worked, this board is unsolvable
        return False
    
    def get_metrics(self) -> dict:
        """Get solver performance metrics."""
        return {
            "solution_time": self.solution_time,
            "prediction_steps": self.prediction_steps,
            "backtracking_steps": self.backtracking_steps,
            "total_steps": self.prediction_steps + self.backtracking_steps
        }