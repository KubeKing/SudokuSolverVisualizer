import { SudokuSolver, isValidSudoku } from '../../lib/sudokuSolver';

/**
 * API handler for visualizing Sudoku solution steps
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
    // Solve with step recording
    const solver = new SudokuSolver(size);
    const [solvedGrid, steps, stats] = solver.solve(grid, true);

    if (solvedGrid) {
      // Convert steps to visualization format
      const visualization = SudokuSolver.getSolvingVisualization(steps, grid, size);

      return res.status(200).json({
        steps: visualization,
        solved: true,
        mistakes: stats.mistakes || 0,
        steps_count: stats.steps || 0,
        minimumSteps: stats.minimumSteps || 0
      });
    } else {
      return res.status(200).json({
        steps: [],
        solved: false
      });
    }
  } catch (error) {
    console.error('Error visualizing solution:', error);
    return res.status(500).json({ 
      message: 'An error occurred while visualizing the solution', 
      error: error.message 
    });
  }
}
