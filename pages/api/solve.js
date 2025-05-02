import { SudokuSolver, isValidSudoku } from '../../lib/sudokuSolver';

/**
 * API handler for solving Sudoku puzzles
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 */
export default function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { grid, size = 9 } = req.body;

  // Validate input
  if (!grid || !Array.isArray(grid) || grid.length !== size || !grid.every(row => row.length === size)) {
    return res.status(400).json({ message: 'Invalid grid dimensions' });
  }

  if (!isValidSudoku(grid, size)) {
    return res.status(400).json({ message: 'Invalid Sudoku grid (constraint violation)' });
  }

  try {
    // Solve the puzzle
    const solver = new SudokuSolver(size);
    const [solvedGrid, steps, stats] = solver.solve(grid);

    if (solvedGrid) {
      return res.status(200).json({
        solved: true,
        grid: solvedGrid,
        message: 'Puzzle solved successfully',
        mistakes: stats.mistakes || 0,
        steps: stats.steps || 0,
        minimumSteps: stats.minimumSteps || 0
      });
    } else {
      return res.status(200).json({
        solved: false,
        grid: null,
        message: 'No solution exists for this puzzle'
      });
    }
  } catch (error) {
    console.error('Error solving puzzle:', error);
    return res.status(500).json({ 
      message: 'An error occurred while solving the puzzle', 
      error: error.message 
    });
  }
}
