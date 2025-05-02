import { generateSudoku } from '../../lib/sudokuSolver';

/**
 * API handler for generating Sudoku puzzles
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 */
export default function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { difficulty = 'medium', size = 9 } = req.body;

  try {
    // Generate a new Sudoku puzzle
    const grid = generateSudoku(difficulty, size);
    
    return res.status(200).json({
      grid,
      size
    });
  } catch (error) {
    console.error('Error generating puzzle:', error);
    return res.status(500).json({ 
      message: 'An error occurred while generating the puzzle', 
      error: error.message 
    });
  }
}
