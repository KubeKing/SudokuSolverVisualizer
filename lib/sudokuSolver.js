/**
 * Sudoku solver using Dancing Links algorithm.
 * Converts a Sudoku grid to an exact cover problem and solves it.
 */
import DancingLinks from './dlx';

class SudokuSolver {
  /**
   * Initialize the Sudoku solver.
   * @param {number} size Size of the Sudoku grid (default: 9 for 9x9 puzzle)
   */
  constructor(size = 9) {
    this.size = size;
    this.boxSize = Math.floor(Math.sqrt(size)); // 3 for 9x9, 4 for 16x16
    this.dlx = new DancingLinks();
    
    // For mapping back from solution to grid
    this.rowColDigitMap = {};
  }

  /**
   * Create all constraint columns for the DLX matrix.
   * @returns {Object} A map of column names to Column objects
   */
  _createConstraints() {
    const columns = {};
    
    // 1. Cell constraints: each cell must contain exactly one digit
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const colName = `cell_r${r}c${c}`;
        columns[colName] = this.dlx.addColumn(colName);
      }
    }
    
    // 2. Row constraints: each digit must appear exactly once in each row
    for (let r = 0; r < this.size; r++) {
      for (let d = 1; d <= this.size; d++) {
        const colName = `row_r${r}d${d}`;
        columns[colName] = this.dlx.addColumn(colName);
      }
    }
    
    // 3. Column constraints: each digit must appear exactly once in each column
    for (let c = 0; c < this.size; c++) {
      for (let d = 1; d <= this.size; d++) {
        const colName = `col_c${c}d${d}`;
        columns[colName] = this.dlx.addColumn(colName);
      }
    }
    
    // 4. Box constraints: each digit must appear exactly once in each box
    for (let boxR = 0; boxR < this.boxSize; boxR++) {
      for (let boxC = 0; boxC < this.boxSize; boxC++) {
        for (let d = 1; d <= this.size; d++) {
          const boxIdx = boxR * this.boxSize + boxC;
          const colName = `box_b${boxIdx}d${d}`;
          columns[colName] = this.dlx.addColumn(colName);
        }
      }
    }
    
    return columns;
  }

  /**
   * Build the exact cover matrix from a Sudoku grid.
   * @param {Array<Array<number>>} grid 2D array representing the Sudoku grid (0 for empty cells)
   */
  buildExactCover(grid) {
    const columns = this._createConstraints();
    
    // For each possible cell placement (r, c, d), create a row with 4 ones
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        // Calculate which box this cell belongs to
        const boxR = Math.floor(r / this.boxSize);
        const boxC = Math.floor(c / this.boxSize);
        const boxIdx = boxR * this.boxSize + boxC;
        
        // If cell has a value, only consider that digit
        // Otherwise, consider all possible digits
        const digits = grid[r][c] !== 0 ? [grid[r][c]] : Array.from({length: this.size}, (_, i) => i + 1);
        
        for (const d of digits) {
          // Get the four columns this placement satisfies
          const cols = [
            columns[`cell_r${r}c${c}`],       // Cell constraint
            columns[`row_r${r}d${d}`],        // Row constraint
            columns[`col_c${c}d${d}`],        // Column constraint
            columns[`box_b${boxIdx}d${d}`]    // Box constraint
          ];
          
          // Add this row to the DLX matrix
          this.dlx.addRow(cols);
          
          // Store mapping for solution decoding
          const rowId = [r, c, d];
          // We'll use the column names to retrieve this row later
          this.rowColDigitMap[`cell_r${r}c${c}`] = rowId;
        }
      }
    }
  }

  /**
   * Decode a solution from the DLX algorithm back to a Sudoku grid.
   * @param {Array} solution List of nodes representing a solution from DLX
   * @returns {Array<Array<number>>} Completed Sudoku grid
   */
  decodeSolution(solution) {
    // Initialize empty grid
    const grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
    
    // For each row in the solution
    for (const row of solution) {
      // Find the cell constraint column (always the first one in our encoding)
      const cellCol = row.column.name;
      
      // Look up the (r, c, d) mapping
      if (this.rowColDigitMap[cellCol]) {
        const [r, c, d] = this.rowColDigitMap[cellCol];
        grid[r][c] = d;
      }
    }
    
    return grid;
  }

  /**
   * Solve a Sudoku puzzle.
   * @param {Array<Array<number>>} grid 2D array representing the Sudoku grid (0 for empty cells)
   * @param {boolean} recordSteps Whether to record steps for visualization
   * @returns {Array} Tuple of [solved grid, solving steps, solving stats]
   */
  solve(grid, recordSteps = false) {
    // Reset the solver
    this.dlx = new DancingLinks();
    this.rowColDigitMap = {};
    
    // Build the exact cover matrix
    this.buildExactCover(grid);
    
    // Solve the exact cover problem
    const solutions = this.dlx.solve(recordSteps);
    
    if (!solutions || solutions.length === 0) {
      return [null, [], {}];
    }
    
    // Decode the first solution
    const solvedGrid = this.decodeSolution(solutions[0]);
    
    // Count mistakes (backtracking operations)
    let mistakes = 0;
    let forwardSteps = 0;
    
    for (const [stepType] of this.dlx.steps) {
      if (stepType === "deselect_row") {
        mistakes += 1;
      } else if (stepType === "select_row") {
        forwardSteps += 1;
      }
    }
    
    // Calculate minimum steps (filled cells that weren't given)
    const emptyCells = grid.reduce((count, row) => 
      count + row.filter(cell => cell === 0).length, 0);
    const minimumSteps = emptyCells;
    
    const stats = {
      mistakes,
      steps: forwardSteps,
      minimumSteps
    };
    
    // Return the solution, steps, and statistics
    return [solvedGrid, this.dlx.steps, stats];
  }

  /**
   * Convert solving steps to a format suitable for visualization.
   * @param {Array} steps List of steps from the DLX algorithm
   * @param {Array<Array<number>>} initialGrid The initial Sudoku grid
   * @param {number} size Size of the grid
   * @returns {Array} List of grid states for visualization
   */
  static getSolvingVisualization(steps, initialGrid, size = 9) {
    // Initialize with the initial grid
    const currentGrid = initialGrid.map(row => [...row]);
    const visualizations = [{
      grid: currentGrid.map(row => [...row]), 
      step: "initial"
    }];
    
    const placedCells = new Set();
    
    for (const [stepType, data] of steps) {
      if (stepType === "select_row" && Array.isArray(data)) {
        // Find the cell constraint in the row
        const cellCol = data.find(col => col.startsWith("cell_"));
        
        if (cellCol) {
          // Extract r, c, d from column name
          const parts = cellCol.replace("cell_r", "").split("c");
          if (parts.length === 2) {
            const r = parseInt(parts[0]);
            const cParts = parts[1].split("_");
            const c = parseInt(cParts[0]);
            
            // Find the digit from row/col/box constraints
            let d = null;
            for (const col of data) {
              if (col.startsWith("row_") && col.includes(`r${r}`)) {
                const dPart = col.split("d")[1];
                d = parseInt(dPart);
                break;
              }
            }
            
            if (d !== null && !placedCells.has(`${r},${c}`)) {
              currentGrid[r][c] = d;
              placedCells.add(`${r},${c}`);
              
              // Add this state to visualization
              visualizations.push({
                grid: currentGrid.map(row => [...row]),
                step: `Place ${d} at (${r},${c})`,
                highlight: [r, c]
              });
            }
          }
        }
      } else if (stepType === "deselect_row" && typeof data === 'string' && data.startsWith("cell_")) {
        // When backtracking, we need to remove the placement
        const parts = data.replace("cell_r", "").split("c");
        if (parts.length === 2) {
          const r = parseInt(parts[0]);
          const c = parseInt(parts[1]);
          
          if (placedCells.has(`${r},${c}`)) {
            placedCells.delete(`${r},${c}`);
            // Only reset if it wasn't in the initial grid
            if (initialGrid[r][c] === 0) {
              currentGrid[r][c] = 0;
              
              // Add this state to visualization
              visualizations.push({
                grid: currentGrid.map(row => [...row]),
                step: `Backtrack from (${r},${c})`,
                highlight: [r, c]
              });
            }
          }
        }
      }
    }
    
    return visualizations;
  }
}

/**
 * Check if a Sudoku grid is valid (no constraint violations).
 * @param {Array<Array<number>>} grid 2D array representing the Sudoku grid
 * @param {number} size Size of the grid
 * @returns {boolean} True if the grid is valid, False otherwise
 */
function isValidSudoku(grid, size = 9) {
  const boxSize = Math.floor(Math.sqrt(size));
  
  // Check rows
  for (let r = 0; r < size; r++) {
    const rowDigits = new Set();
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) {
        if (rowDigits.has(grid[r][c])) {
          return false;
        }
        rowDigits.add(grid[r][c]);
      }
    }
  }
  
  // Check columns
  for (let c = 0; c < size; c++) {
    const colDigits = new Set();
    for (let r = 0; r < size; r++) {
      if (grid[r][c] !== 0) {
        if (colDigits.has(grid[r][c])) {
          return false;
        }
        colDigits.add(grid[r][c]);
      }
    }
  }
  
  // Check boxes
  for (let boxR = 0; boxR < boxSize; boxR++) {
    for (let boxC = 0; boxC < boxSize; boxC++) {
      const boxDigits = new Set();
      for (let r = boxR * boxSize; r < (boxR + 1) * boxSize; r++) {
        for (let c = boxC * boxSize; c < (boxC + 1) * boxSize; c++) {
          if (grid[r][c] !== 0) {
            if (boxDigits.has(grid[r][c])) {
              return false;
            }
            boxDigits.add(grid[r][c]);
          }
        }
      }
    }
  }
  
  return true;
}

/**
 * Generate a Sudoku puzzle with the specified difficulty.
 * @param {string} difficulty Difficulty level ("easy", "medium", "hard", "expert")
 * @param {number} size Size of the grid
 * @returns {Array<Array<number>>} 2D array representing a Sudoku puzzle
 */
function generateSudoku(difficulty = "medium", size = 9) {
  // Define difficulty levels (number of cells to keep filled)
  const difficultyLevels = {
    "easy": 45,     // ~36 empty cells
    "medium": 35,   // ~46 empty cells
    "hard": 30,     // ~51 empty cells
    "expert": 25    // ~56 empty cells
  };
  
  // Use medium if specified difficulty doesn't exist
  const filledCells = difficultyLevels[difficulty.toLowerCase()] || difficultyLevels["medium"];
  
  // Generate a solved board
  const solvedBoard = _generateSolvedBoard(size);
  
  // Create a copy to work with
  const puzzle = solvedBoard.map(row => [...row]);
  
  // Get all cell positions
  const positions = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push([r, c]);
    }
  }
  
  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  // Keep track of removed positions for backtracking
  const removedPositions = [];
  
  // Remove numbers while ensuring unique solution
  const solver = new SudokuSolver(size);
  
  for (const [r, c] of positions) {
    // Skip if we've reached our target number of filled cells
    if (positions.length - removedPositions.length <= filledCells) {
      break;
    }
    
    // Remember the value
    const temp = puzzle[r][c];
    puzzle[r][c] = 0;
    removedPositions.push([r, c, temp]);
    
    // Check if still has unique solution
    // For performance, we check after removing a batch of cells
    if (removedPositions.length % 5 === 0) {
      // Make a copy for testing
      const testPuzzle = puzzle.map(row => [...row]);
      
      // Count solutions (up to 2)
      const solutions = _countSolutions(testPuzzle, size, 2);
      
      // If not unique, restore last batch of removed cells
      if (solutions !== 1) {
        for (let i = 0; i < Math.min(5, removedPositions.length); i++) {
          const [rr, cc, val] = removedPositions.pop();
          puzzle[rr][cc] = val;
        }
      }
    }
  }
  
  return puzzle;
}

/**
 * Generate a completely solved Sudoku board.
 * @param {number} size Size of the grid
 * @returns {Array<Array<number>>} 2D array representing a solved Sudoku grid
 */
function _generateSolvedBoard(size = 9) {
  const board = Array(size).fill().map(() => Array(size).fill(0));
  const boxSize = Math.floor(Math.sqrt(size));
  
  // Fill the board using backtracking
  function _isValid(board, row, col, num) {
    // Check row
    for (let x = 0; x < size; x++) {
      if (board[row][x] === num) {
        return false;
      }
    }
    
    // Check column
    for (let x = 0; x < size; x++) {
      if (board[x][col] === num) {
        return false;
      }
    }
    
    // Check box
    const startRow = boxSize * Math.floor(row / boxSize);
    const startCol = boxSize * Math.floor(col / boxSize);
    for (let r = startRow; r < startRow + boxSize; r++) {
      for (let c = startCol; c < startCol + boxSize; c++) {
        if (board[r][c] === num) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  function _solveBoard(board) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] === 0) {
          // Try digits 1-9 in random order
          const nums = Array.from({length: size}, (_, i) => i + 1);
          
          // Shuffle the nums array
          for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
          }
          
          for (const num of nums) {
            if (_isValid(board, row, col, num)) {
              board[row][col] = num;
              
              if (_solveBoard(board)) {
                return true;
              }
              
              board[row][col] = 0;
            }
          }
          
          return false;
        }
      }
    }
    return true;
  }
  
  _solveBoard(board);
  return board;
}

/**
 * Count the number of solutions for a Sudoku puzzle, up to maxCount.
 * @param {Array<Array<number>>} grid 2D array representing the Sudoku puzzle
 * @param {number} size Size of the grid
 * @param {number} maxCount Maximum number of solutions to find before stopping
 * @returns {number} Number of solutions (stops counting at maxCount)
 */
function _countSolutions(grid, size = 9, maxCount = 1) {
  const boxSize = Math.floor(Math.sqrt(size));
  let solutions = 0;
  
  function _isValid(row, col, num) {
    // Check row
    for (let x = 0; x < size; x++) {
      if (grid[row][x] === num) {
        return false;
      }
    }
    
    // Check column
    for (let x = 0; x < size; x++) {
      if (grid[x][col] === num) {
        return false;
      }
    }
    
    // Check box
    const startRow = boxSize * Math.floor(row / boxSize);
    const startCol = boxSize * Math.floor(col / boxSize);
    for (let r = startRow; r < startRow + boxSize; r++) {
      for (let c = startCol; c < startCol + boxSize; c++) {
        if (grid[r][c] === num) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  function _backtrack() {
    if (solutions >= maxCount) {
      return;
    }
    
    // Find an empty cell
    let row = -1;
    let col = -1;
    
    outerLoop:
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          row = r;
          col = c;
          break outerLoop;
        }
      }
    }
    
    // No empty cell means we found a solution
    if (row === -1) {
      solutions += 1;
      return;
    }
    
    // Try each valid number
    for (let num = 1; num <= size; num++) {
      if (_isValid(row, col, num)) {
        grid[row][col] = num;
        _backtrack();
        grid[row][col] = 0;  // Backtrack
        
        // If we've reached maxCount, stop
        if (solutions >= maxCount) {
          return;
        }
      }
    }
  }
  
  _backtrack();
  return solutions;
}

export { SudokuSolver, isValidSudoku, generateSudoku };
