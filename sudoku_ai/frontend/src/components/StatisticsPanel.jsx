import React from 'react';
import './StatisticsPanel.css';

const StatisticsPanel = ({ statistics = {} }) => {
  const {
    mistakes = 0,
    time = 0,
    filledCells = 0,
    totalCells = 81,
    complexity = 'Medium',
    steps = 0,
    minimumSteps = 0,
  } = statistics;

  // Format the time (seconds) to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage of filled cells
  const completionPercentage = Math.round((filledCells / totalCells) * 100);

  // Calculate efficiency
  const efficiency = minimumSteps > 0 && steps > 0 
    ? Math.round((minimumSteps / steps) * 100) 
    : 100;

  return (
    <div className="statistics-panel">
      <div className="stat-item">
        <div className="stat-label">Mistakes</div>
        <div className="stat-value">{mistakes}</div>
      </div>
      
      <div className="stat-item">
        <div className="stat-label">Time</div>
        <div className="stat-value">{formatTime(time)}</div>
      </div>
      
      <div className="stat-item">
        <div className="stat-label">Completion</div>
        <div className="stat-value">
          {filledCells}/{totalCells}
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="stat-item">
        <div className="stat-label">Complexity</div>
        <div className="stat-value">{complexity}</div>
      </div>
      
      {steps > 0 && (
        <div className="stat-item">
          <div className="stat-label">Efficiency</div>
          <div className="stat-value">
            {efficiency}%
            <div className="progress-bar">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${efficiency}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPanel;
