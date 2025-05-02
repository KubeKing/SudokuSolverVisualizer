import { isValidSudoku } from '../../lib/sudokuSolver';

/**
 * API handler for validating Sudoku grids
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

  // Validate grid dimensions
  if (!grid || !Array.isArray(grid) || grid.length !== size || !grid.every(row => row.length === size)) {
    return res.status(400).json({ 
      valid: false,
      message: 'Invalid grid dimensions'
    });
  }

  try {
    // Check if grid is valid
    const valid = isValidSudoku(grid, size);
    
    return res.status(200).json({
      valid,
      message: valid ? 'Grid is valid' : 'Grid has constraint violations'
    });
  } catch (error) {
    console.error('Error validating grid:', error);
    return res.status(500).json({ 
      valid: false,
      message: 'An error occurred while validating the grid', 
      error: error.message 
    });
  }
}
