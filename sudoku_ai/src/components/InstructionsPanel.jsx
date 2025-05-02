import React from 'react';

const InstructionsPanel = () => {
  return (
    <div className="instructions-panel">
      <h3 className="panel-header">How to Play Sudoku</h3>
      
      <div className="instruction-section">
        <h4>The Rules</h4>
        <p>
          Fill in the grid so that every row, column, and 3×3 box contains the digits 1 through 9 
          without repeating any numbers.
        </p>
      </div>
      
      <div className="instruction-section">
        <h4>Getting Started</h4>
        <ul>
          <li>Select difficulty level from the dropdown menu</li>
          <li>Click "New Game" to generate a new puzzle</li>
          <li>Click on empty cells and type numbers to fill them in</li>
          <li>Initially filled numbers cannot be changed</li>
        </ul>
      </div>
      
      <div className="instruction-section">
        <h4>Solver Mode</h4>
        <ul>
          <li>Switch to "Solve" mode to use the automatic solver</li>
          <li>Click "Solve" to instantly see the solution</li>
          <li>The solving process will be displayed in this panel</li>
          <li>Use controls to pause, resume, or step through the process</li>
          <li>Adjust the speed using the slider below</li>
        </ul>
      </div>
      
      <div className="instruction-section">
        <h4>About Dancing Links</h4>
        <p>
          This solver uses Donald Knuth's "Dancing Links" algorithm, a highly efficient approach 
          for solving exact cover problems like Sudoku. Watch the algorithm work step-by-step
          to see how it intelligently backtracks and finds solutions.
        </p>
      </div>
    </div>
  );
};

export default InstructionsPanel;
