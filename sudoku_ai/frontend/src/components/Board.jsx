import React from 'react';
import './Board.css';

const Board = ({ grid, initialGrid, onCellChange, readOnly }) => {
  const size = grid.length;
  const boxSize = Math.sqrt(size);

  const handleCellInput = (e, row, col) => {
    const value = e.target.value === '' ? 0 : parseInt(e.target.value.slice(-1), 10);
    
    // Only allow numbers 1-9 (or size of grid)
    if ((value >= 1 && value <= size) || value === 0) {
      onCellChange(row, col, value);
    }
  };

  const isInitialCell = (row, col) => {
    return initialGrid && initialGrid[row][col] !== 0;
  };

  const renderCell = (row, col) => {
    const value = grid[row][col];
    const isInitial = isInitialCell(row, col);
    
    // Determine cell styling
    const cellClasses = [
      'cell',
      isInitial ? 'initial' : '',
      readOnly && !isInitial && value !== 0 ? 'filled' : '',
    ].filter(Boolean).join(' ');
    
    return (
      <input
        type="text"
        className={cellClasses}
        value={value === 0 ? '' : value}
        onChange={(e) => handleCellInput(e, row, col)}
        readOnly={readOnly || isInitial}
        maxLength="1"
        inputMode="numeric"
        pattern="[0-9]*"
        key={`cell-${row}-${col}`}
      />
    );
  };

  const renderRow = (row) => {
    return (
      <div className="row" key={`row-${row}`}>
        {Array.from({ length: size }, (_, col) => renderCell(row, col))}
      </div>
    );
  };

  return (
    <div className="board">
      {Array.from({ length: size }, (_, row) => renderRow(row))}
    </div>
  );
};

export default Board;