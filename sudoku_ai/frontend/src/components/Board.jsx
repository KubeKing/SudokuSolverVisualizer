import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Cell from './Cell';

const Board = ({ 
  board, 
  originalBoard, 
  solution, 
  onMove, 
  onSolved,
  readOnly,
  showHints
}) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilMarks, setPencilMarks] = useState(Array(9).fill().map(() => Array(9).fill().map(() => [])));
  const [errors, setErrors] = useState(Array(9).fill().map(() => Array(9).fill(false)));
  const [boardState, setBoardState] = useState(Array(9).fill().map(() => Array(9).fill(0)));

  // Initialize board state
  useEffect(() => {
    if (board) {
      setBoardState(board.map(row => [...row]));
    }
  }, [board]);

  // Check if the board is solved
  useEffect(() => {
    if (readOnly) return;
    
    const isBoardFilled = boardState.every(row => row.every(cell => cell !== 0));
    const hasNoErrors = errors.every(row => row.every(cell => !cell));
    
    if (isBoardFilled && hasNoErrors) {
      onSolved && onSolved(boardState);
    }
  }, [boardState, errors, onSolved, readOnly]);

  // Check if a move is valid
  const isValidMove = useCallback((row, col, value) => {
    if (value === 0) return true;
    
    // Check row
    for (let c = 0; c < 9; c++) {
      if (c !== col && boardState[row][c] === value) {
        return false;
      }
    }
    
    // Check column
    for (let r = 0; r < 9; r++) {
      if (r !== row && boardState[r][col] === value) {
        return false;
      }
    }
    
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && boardState[r][c] === value) {
          return false;
        }
      }
    }
    
    return true;
  }, [boardState]);

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (readOnly) return;
    
    // Don't select original cells
    if (originalBoard[row][col] !== 0) return;
    
    setSelectedCell([row, col]);
  };

  // Handle cell value change
  const handleValueChange = (row, col, value, marks) => {
    if (readOnly) return;
    
    // Update board state
    const newBoardState = [...boardState];
    newBoardState[row][col] = value;
    setBoardState(newBoardState);
    
    // Update pencil marks
    const newPencilMarks = [...pencilMarks];
    newPencilMarks[row][col] = marks;
    setPencilMarks(newPencilMarks);
    
    // Check for errors
    const newErrors = [...errors];
    newErrors[row][col] = value !== 0 && !isValidMove(row, col, value);
    setErrors(newErrors);
    
    // Notify parent component
    onMove && onMove(row, col, value, newBoardState);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!selectedCell || readOnly) return;
    
    const [row, col] = selectedCell;
    
    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) setSelectedCell([row - 1, col]);
        break;
      case 'ArrowDown':
        if (row < 8) setSelectedCell([row + 1, col]);
        break;
      case 'ArrowLeft':
        if (col > 0) setSelectedCell([row, col - 1]);
        break;
      case 'ArrowRight':
        if (col < 8) setSelectedCell([row, col + 1]);
        break;
      case 'p':
        setPencilMode(!pencilMode);
        break;
      default:
        break;
    }
  };

  // Toggle pencil mode
  const togglePencilMode = () => {
    setPencilMode(!pencilMode);
  };

  // Clear selected cell
  const clearSelectedCell = () => {
    if (!selectedCell || readOnly) return;
    
    const [row, col] = selectedCell;
    
    // Don't clear original cells
    if (originalBoard[row][col] !== 0) return;
    
    handleValueChange(row, col, 0, []);
  };

  // Handle number pad click
  const handleNumberPad = (num) => {
    if (!selectedCell || readOnly) return;
    
    const [row, col] = selectedCell;
    
    // Don't modify original cells
    if (originalBoard[row][col] !== 0) return;
    
    if (pencilMode) {
      // Toggle pencil mark
      const marks = [...pencilMarks[row][col]];
      const index = marks.indexOf(num);
      
      if (index === -1) {
        marks.push(num);
      } else {
        marks.splice(index, 1);
      }
      
      handleValueChange(row, col, 0, marks);
    } else {
      // Set cell value
      handleValueChange(row, col, num, []);
    }
  };

  return (
    <div className="flex flex-col items-center" onKeyDown={handleKeyDown} tabIndex="0">
      {/* Sudoku Board */}
      <div className="grid grid-cols-9 grid-rows-9 bg-white shadow-md rounded-lg overflow-hidden">
        {boardState.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              value={cell}
              row={rowIndex}
              col={colIndex}
              isOriginal={originalBoard[rowIndex][colIndex] !== 0}
              isSelected={selectedCell && selectedCell[0] === rowIndex && selectedCell[1] === colIndex}
              isPencilMode={pencilMode}
              pencilMarks={pencilMarks[rowIndex][colIndex]}
              error={errors[rowIndex][colIndex]}
              onCellClick={handleCellClick}
              onValueChange={handleValueChange}
              solution={solution && solution[rowIndex][colIndex]}
              showHint={showHints}
            />
          ))
        )}
      </div>

      {!readOnly && (
        <div className="mt-6 space-y-4">
          {/* Number Pad */}
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                className="h-10 w-10 md:h-12 md:w-12 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold flex items-center justify-center transition-colors"
                onClick={() => handleNumberPad(num)}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <button
              className={`px-4 py-2 rounded-md ${pencilMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} transition-colors`}
              onClick={togglePencilMode}
            >
              Pencil Mode
            </button>
            <button
              className="px-4 py-2 rounded-md bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
              onClick={clearSelectedCell}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

Board.propTypes = {
  board: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  ).isRequired,
  originalBoard: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  ),
  solution: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  ),
  onMove: PropTypes.func,
  onSolved: PropTypes.func,
  readOnly: PropTypes.bool,
  showHints: PropTypes.bool
};

Board.defaultProps = {
  originalBoard: Array(9).fill().map(() => Array(9).fill(0)),
  solution: null,
  readOnly: false,
  showHints: false
};

export default Board;