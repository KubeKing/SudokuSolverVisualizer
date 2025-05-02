import React from 'react';
import './ControlStatsPanel.css';

const ControlStatsPanel = ({
  statistics = {},
  isVisualizing = false,
  visualizationActive = false,
  currentStep = 0,
  totalSteps = 0,
  speed = 500,
  onStop = () => {},
  onResume = () => {},
  onStepForward = () => {},
  onStepBackward = () => {},
  onSpeedChange = () => {},
  stepDescription = '' // Add the new prop here
}) => {
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

  // Speed presets
  const speedOptions = [
    { value: 1000, label: 'Slow' },
    { value: 500, label: 'Medium' },
    { value: 200, label: 'Fast' },
    { value: 100, label: 'Very Fast' },
  ];

  // Find the current speed option index
  const currentSpeedIndex = speedOptions.findIndex(option => option.value === speed) || 1;

  return (
    <div className="control-stats-panel">
      <div className="stats-section">
        {/* Statistics */}
        <div className="stats-group">
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

          {/* Display Step Description */}
          <div className="visualizer-info">
            <div className="step-description">
              <p>{stepDescription}</p>
            </div>
          </div>
        </div>
      )}
    </div>
      </div>

      {visualizationActive && (
        <div className="controls-section">
          {/* Step counter */}
          <div className="step-counter">
            Step {currentStep + 1} of {totalSteps}
          </div>
          
          {/* Control buttons */}
          <div className="control-buttons">
            <button 
              className="control-button"
              onClick={onStepBackward} 
              disabled={currentStep === 0 || isVisualizing}
            >
              Previous
            </button>
            
            {isVisualizing ? (
              <button 
                className="control-button pause-button"
                onClick={onStop}
              >
                Pause
              </button>
            ) : (
              <button 
                className="control-button play-button"
                onClick={onResume}
              >
                Play
              </button>
            )}
            
            <button 
              className="control-button"
              onClick={onStepForward} 
              disabled={currentStep === totalSteps - 1 || isVisualizing}
            >
              Next
            </button>
          </div>
          
          {/* Speed control */}
          <div className="speed-control">
            <label>Speed:</label>
            <div className="speed-options">
              {speedOptions.map((option, index) => (
                <button
                  key={option.value}
                  className={`speed-option ${index === currentSpeedIndex ? 'active' : ''}`}
                  onClick={() => onSpeedChange(option.value)}
                  disabled={isVisualizing}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlStatsPanel;
