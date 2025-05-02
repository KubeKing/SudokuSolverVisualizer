import React from 'react';
import './Visualizer.css';
import Board from './Board';

const Visualizer = ({
  step,
  currentIndex,
  totalSteps
}) => {
  const { grid, highlight, step: stepDescription } = step || { grid: [], highlight: null, step: '' };

  return (
    <div className="visualizer">
      <div className="visualizer-header">
        <h3>Solving Visualization</h3>
      </div>
      
      <div className="visualizer-content">
        <div className="visualizer-grid">
          <Board
            grid={grid}
            readOnly={true}
            highlight={highlight}
          />
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
