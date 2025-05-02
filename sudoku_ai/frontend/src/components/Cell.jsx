import React from 'react';
import PropTypes from 'prop-types';

const Cell = ({
  value,
  isOriginal, // Renamed from isFixed
  isSelected,
  error, // Changed from hasError to match Board's prop
  isHighlighted, // Keep for potential future use or remove if definitely unused
  onCellClick, // Changed from onClick to match Board's prop
  row,
  col
}) => {
  // Determine cell styling based on properties
  const borderClasses = [
    'border',
    'border-gray-300',
    row % 3 === 0 ? 'border-t-2 border-t-black' : '', // Thicker top border for rows 0, 3, 6
    row % 3 === 2 ? 'border-b-2 border-b-black' : '', // Thicker bottom border for rows 2, 5, 8
    col % 3 === 0 ? 'border-l-2 border-l-black' : '', // Thicker left border for cols 0, 3, 6
    col % 3 === 2 ? 'border-r-2 border-r-black' : '', // Thicker right border for cols 2, 5, 8
  ].filter(Boolean).join(' '); // Filter out empty strings

  const cellClasses = [
    'w-full h-full flex items-center justify-center',
    'text-xl font-medium transition-colors duration-150',
    isOriginal ? 'text-gray-900 font-bold bg-gray-100' : 'text-blue-700', // Style original numbers differently
    isSelected ? 'bg-blue-200' : (isHighlighted ? 'bg-blue-100' : 'bg-white'),
    error ? 'text-red-600 bg-red-100' : '', // Use error prop
    borderClasses, // Add dynamic border classes
    isOriginal ? '' : 'cursor-pointer hover:bg-blue-50' // Only show pointer/hover if not original
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cellClasses}
      onClick={() => !isOriginal && onCellClick(row, col)} // Use onCellClick, prevent click on original cells
      data-testid={`cell-${row}-${col}`}
    >
      {value !== 0 ? value : ''}
    </div>
  );
};

Cell.propTypes = {
  value: PropTypes.number.isRequired,
  isOriginal: PropTypes.bool, // Renamed from isFixed
  isSelected: PropTypes.bool,
  error: PropTypes.bool, // Changed from hasError
  isHighlighted: PropTypes.bool,
  onCellClick: PropTypes.func.isRequired, // Changed from onClick
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired
};

Cell.defaultProps = {
  isOriginal: false,
  isSelected: false,
  error: false,
  isHighlighted: false
};

export default Cell;
