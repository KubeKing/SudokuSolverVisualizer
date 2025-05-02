import numpy as np
from typing import List, Optional, Tuple
import time
import json
import os
from pathlib import Path

from ..models.sudoku_board import SudokuBoard
from ..solvers.backtracking import BacktrackingSolver

class PuzzleGenerator:
    """
    A class to generate and manage Sudoku puzzles.
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize the puzzle generator.
        
        Args:
            cache_dir: Directory to cache generated puzzles
        """
        self.solver = BacktrackingSolver(visualize=True)
        self.cache_dir = cache_dir
        
        if cache_dir:
            os.makedirs(cache_dir, exist_ok=True)
    
    def generate_puzzle(self, difficulty: str = "medium") -> SudokuBoard:
        """
        Generate a new Sudoku puzzle.
        
        Args:
            difficulty: Difficulty level - 'easy', 'medium', 'hard', or 'expert'
        
        Returns:
            SudokuBoard instance with the generated puzzle
        """
        # Try to load from cache first
        if self.cache_dir:
            cached_puzzle = self._load_from_cache(difficulty)
            if cached_puzzle:
                return cached_puzzle
        
        # Generate a new puzzle
        start_time = time.time()
        puzzle = self.solver.generate_puzzle(difficulty)
        generation_time = time.time() - start_time
        
        print(f"Generated {difficulty} puzzle in {generation_time:.2f} seconds")
        
        # Cache the puzzle
        if self.cache_dir:
            self._save_to_cache(puzzle, difficulty)
        
        return puzzle
    
    def _save_to_cache(self, board: SudokuBoard, difficulty: str) -> None:
        """
        Save a puzzle to the cache.
        
        Args:
            board: SudokuBoard instance to save
            difficulty: Difficulty level
        """
        if not self.cache_dir:
            return
        
        cache_path = Path(self.cache_dir) / f"{difficulty}_{int(time.time())}.json"
        with open(cache_path, 'w') as f:
            json.dump(board.to_dict(), f)
    
    def _load_from_cache(self, difficulty: str) -> Optional[SudokuBoard]:
        """
        Load a puzzle from the cache.
        
        Args:
            difficulty: Difficulty level
        
        Returns:
            SudokuBoard instance if found, None otherwise
        """
        if not self.cache_dir:
            return None
        
        cache_dir = Path(self.cache_dir)
        matching_files = list(cache_dir.glob(f"{difficulty}_*.json"))
        
        if not matching_files:
            return None
        
        # Pick a random cached puzzle
        cache_path = np.random.choice(matching_files)
        
        try:
            with open(cache_path, 'r') as f:
                data = json.load(f)
                return SudokuBoard.from_dict(data)
        except (json.JSONDecodeError, KeyError):
            # If the file is corrupted, delete it
            os.remove(cache_path)
            return None
    
    def generate_dataset(self, 
                       difficulty: str = "medium",
                       size: int = 1000,
                       output_dir: str = "dataset") -> List[Tuple[SudokuBoard, SudokuBoard]]:
        """
        Generate a dataset of Sudoku puzzles and their solutions.
        
        Args:
            difficulty: Difficulty level
            size: Number of puzzles to generate
            output_dir: Directory to save the dataset
        
        Returns:
            List of (puzzle, solution) pairs
        """
        os.makedirs(output_dir, exist_ok=True)
        
        dataset = []
        start_time = time.time()
        
        for i in range(size):
            puzzle = self.generate_puzzle(difficulty)
            success, solutions = self.solver.solve(puzzle)
            
            if success:
                dataset.append((puzzle, solutions[0]))
                
                # Save to file
                puzzle_path = os.path.join(output_dir, f"puzzle_{i}.txt")
                solution_path = os.path.join(output_dir, f"solution_{i}.txt")
                
                with open(puzzle_path, 'w') as f:
                    f.write(puzzle.to_string())
                
                with open(solution_path, 'w') as f:
                    f.write(solutions[0].to_string())
            
            if (i + 1) % 10 == 0:
                elapsed = time.time() - start_time
                print(f"Generated {i + 1}/{size} puzzles. Time elapsed: {elapsed:.2f}s")
        
        # Save metadata
        metadata = {
            "difficulty": difficulty,
            "size": len(dataset),
            "generation_time": time.time() - start_time
        }
        
        with open(os.path.join(output_dir, "metadata.json"), 'w') as f:
            json.dump(metadata, f)
        
        return dataset

def load_dataset(dataset_dir: str) -> List[Tuple[SudokuBoard, SudokuBoard]]:
    """
    Load a dataset of Sudoku puzzles and their solutions.
    
    Args:
        dataset_dir: Directory containing the dataset
    
    Returns:
        List of (puzzle, solution) pairs
    """
    dataset = []
    
    # List all puzzle files
    puzzle_files = sorted([f for f in os.listdir(dataset_dir) if f.startswith("puzzle_")])
    
    for puzzle_file in puzzle_files:
        # Get the corresponding solution file
        index = puzzle_file.split('_')[1].split('.')[0]
        solution_file = f"solution_{index}.txt"
        
        # Load the puzzle and solution
        with open(os.path.join(dataset_dir, puzzle_file), 'r') as f:
            puzzle_str = f.read().strip()
            puzzle = SudokuBoard.from_string(puzzle_str)
        
        with open(os.path.join(dataset_dir, solution_file), 'r') as f:
            solution_str = f.read().strip()
            solution = SudokuBoard.from_string(solution_str)
        
        dataset.append((puzzle, solution))
    
    return dataset