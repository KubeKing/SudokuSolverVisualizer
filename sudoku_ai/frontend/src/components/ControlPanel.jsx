import React from 'react';
import './ControlPanel.css';

const ControlPanel = ({
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
  stepDescription = ''
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
    <div className="control-panel">
      {/* Stats Cards Row */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-card-title">MISTAKES</div>
          <div className="stat-card-value">{mistakes}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-title">TIME</div>
          <div className="stat-card-value">{formatTime(time)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-title">COMPLETION</div>
          <div className="stat-card-value">
            {filledCells}/{totalCells}
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${completionPercentage}%` }}
                aria-valuenow={completionPercentage}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-title">COMPLEXITY</div>
          <div className="stat-card-value">{complexity}</div>
        </div>
      </div>
      
      {/* Efficiency Card */}
      {steps > 0 && (
        <div className="efficiency-card">
          <div className="efficiency-card-title">EFFICIENCY</div>
          <div className="efficiency-card-value">
            {efficiency}%
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${efficiency}%` }}
                aria-valuenow={efficiency}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Visualization Controls */}
      {visualizationActive && (
        <div className="control-card">
          <div className="step-indicator">
            Step {currentStep + 1} of {totalSteps}
          </div>
          
          <div className="playback-controls">
            <button 
              className="control-button previous-button"
              onClick={onStepBackward} 
              disabled={currentStep === 0 || isVisualizing}
              aria-label="Previous Step"
            >
              <i className="fas fa-step-backward"></i>
              <span>Previous</span>
            </button>
            
            {isVisualizing ? (
              <button 
                className="control-button pause-button"
                onClick={onStop}
                aria-label="Pause Visualization"
              >
                <i className="fas fa-pause"></i>
                <span>Pause</span>
              </button>
            ) : (
              <button 
                className="control-button play-button"
                onClick={onResume}
                aria-label="Play Visualization"
              >
                <i className="fas fa-play"></i>
                <span>Play</span>
              </button>
            )}
            
            <button 
              className="control-button next-button"
              onClick={onStepForward} 
              disabled={currentStep === totalSteps - 1 || isVisualizing}
              aria-label="Next Step"
            >
              <i className="fas fa-step-forward"></i>
              <span>Next</span>
            </button>
          </div>
          
          <div className="speed-control">
            <div className="speed-label">Speed:</div>
            <div className="speed-buttons">
              {speedOptions.map((option, index) => (
                <button
                  key={option.value}
                  className={`speed-button ${index === currentSpeedIndex ? 'active' : ''}`}
                  onClick={() => onSpeedChange(option.value)}
                  disabled={isVisualizing}
                  aria-label={`Set speed to ${option.label}`}
                  aria-pressed={index === currentSpeedIndex}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Current Action Description */}
      {stepDescription && (
        <div className="description-card">
          <div className="description-card-title">CURRENT ACTION</div>
          <div className="description-card-value">{stepDescription}</div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
