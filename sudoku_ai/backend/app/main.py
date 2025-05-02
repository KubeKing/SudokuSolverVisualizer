"""
Main FastAPI application for the Sudoku Solver.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json

from app.solver.sudoku import SudokuSolver, is_valid_sudoku, generate_sudoku

app = FastAPI(title="Sudoku Solver API", 
              description="API for solving Sudoku puzzles using Dancing Links algorithm")

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class SudokuGrid(BaseModel):
    grid: List[List[int]]
    size: int = 9

class SolveResponse(BaseModel):
    solved: bool
    grid: Optional[List[List[int]]] = None
    message: str = ""
    mistakes: int = 0
    steps: int = 0
    minimumSteps: int = 0

class VisualizationStep(BaseModel):
    grid: List[List[int]]
    step: str
    highlight: Optional[tuple] = None

class VisualizationResponse(BaseModel):
    steps: List[Dict]
    solved: bool
    mistakes: int = 0
    steps_count: int = 0
    minimumSteps: int = 0

class GenerateRequest(BaseModel):
    difficulty: str = "medium"
    size: int = 9

@app.get("/")
async def root():
    return {"message": "Welcome to the Sudoku Solver API"}

@app.post("/solve", response_model=SolveResponse)
async def solve_sudoku(sudoku: SudokuGrid):
    """
    Solve a Sudoku puzzle.
    """
    # Validate input
    if not all(len(row) == sudoku.size for row in sudoku.grid):
        raise HTTPException(status_code=400, detail="Invalid grid dimensions")
    
    if not is_valid_sudoku(sudoku.grid, sudoku.size):
        raise HTTPException(status_code=400, detail="Invalid Sudoku grid (constraint violation)")
    
    # Solve the puzzle
    solver = SudokuSolver(sudoku.size)
    solved_grid, _, stats = solver.solve(sudoku.grid)
    
    if solved_grid:
        return {
            "solved": True,
            "grid": solved_grid,
            "message": "Puzzle solved successfully",
            "mistakes": stats.get("mistakes", 0),
            "steps": stats.get("steps", 0),
            "minimumSteps": stats.get("minimumSteps", 0)
        }
    else:
        return {
            "solved": False,
            "grid": None,
            "message": "No solution exists for this puzzle"
        }

@app.post("/solve/visualize", response_model=VisualizationResponse)
async def visualize_solution(sudoku: SudokuGrid):
    """
    Solve a Sudoku puzzle and return step-by-step visualization data.
    """
    # Validate input
    if not all(len(row) == sudoku.size for row in sudoku.grid):
        raise HTTPException(status_code=400, detail="Invalid grid dimensions")
    
    if not is_valid_sudoku(sudoku.grid, sudoku.size):
        raise HTTPException(status_code=400, detail="Invalid Sudoku grid (constraint violation)")
    
    # Solve with step recording
    solver = SudokuSolver(sudoku.size)
    solved_grid, steps, stats = solver.solve(sudoku.grid, record_steps=True)
    
    if solved_grid:
        # Convert steps to visualization format
        visualization = solver.get_solving_visualization(steps, sudoku.grid, sudoku.size)
        
        return {
            "steps": visualization,
            "solved": True,
            "mistakes": stats.get("mistakes", 0),
            "steps_count": stats.get("steps", 0),
            "minimumSteps": stats.get("minimumSteps", 0)
        }
    else:
        return {
            "steps": [],
            "solved": False
        }

@app.post("/validate", response_model=dict)
async def validate_sudoku(sudoku: SudokuGrid):
    """
    Check if a Sudoku grid is valid (no constraint violations).
    """
    valid = is_valid_sudoku(sudoku.grid, sudoku.size)
    
    return {
        "valid": valid,
        "message": "Grid is valid" if valid else "Grid has constraint violations"
    }

@app.post("/generate", response_model=SudokuGrid)
async def generate_puzzle(request: GenerateRequest):
    """
    Generate a new Sudoku puzzle.
    """
    grid = generate_sudoku(request.difficulty, request.size)
    
    return {
        "grid": grid,
        "size": request.size
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
