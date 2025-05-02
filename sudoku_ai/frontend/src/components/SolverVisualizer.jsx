import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Board from './Board';

const SolverVisualizer = ({ originalBoard, steps, metrics, solverType }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500); // ms between steps
  const [boardState, setBoardState] = useState(null);
  const playbackRef = useRef(null);

  // Initialize board state with the first step
  useEffect(() => {
    if (steps && steps.length > 0) {
      setBoardState(steps[0]);
      setCurrentStep(0);
    }
  }, [steps]);

  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        setCurrentStep(prevStep => {
          if (prevStep >= steps.length - 1) {
            setIsPlaying(false);
            return prevStep;
          }
          return prevStep + 1;
        });
      }, playbackSpeed);
    } else if (playbackRef.current) {
      clearInterval(playbackRef.current);
    }

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, steps]);

  // Update board state when step changes
  useEffect(() => {
    if (steps && steps.length > 0 && currentStep < steps.length) {
      setBoardState(steps[currentStep]);
    }
  }, [currentStep, steps]);

  // Play/Pause toggle
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Reset to beginning
  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  // Skip to end
  const skipToEnd = () => {
    setIsPlaying(false);
    setCurrentStep(steps.length - 1);
  };

  // Step forward
  const stepForward = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Step backward
  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Change playback speed
  const handleSpeedChange = (e) => {
    const newSpeed = parseInt(e.target.value, 10);
    setPlaybackSpeed(newSpeed);
  };

  // Format metrics
  const formatMetric = (name, value) => {
    if (name.includes('time')) {
      return `${value.toFixed(3)} s`;
    }
    return value.toString();
  };

  // Render metrics
  const renderMetrics = () => {
    if (!metrics) return null;

    return (
      <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Solver Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="font-medium">{formatMetric(key, value)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Solver Type: <span className="font-medium">{solverType}</span>
        </p>
      </div>
    );
  };

  if (!steps || steps.length === 0 || !boardState) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">No solution steps available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <Board
          board={boardState}
          originalBoard={originalBoard}
          readOnly={true}
        />
        
        <div className="mt-6 w-full max-w-md">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round((currentStep / (steps.length - 1)) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max={steps.length - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
          
          {/* Playback controls */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={resetPlayback}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Reset"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v8h8"></path>
                <path d="M2 12a10 10 0 0 1 17.75-6.54"></path>
                <path d="M21 22v-8h-8"></path>
                <path d="M22 12a10 10 0 0 1-17.75 6.54"></path>
              </svg>
            </button>
            
            <button
              onClick={stepBackward}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Step backward"
              disabled={currentStep === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5"></line>
              </svg>
            </button>
            
            <button
              onClick={togglePlayback}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 h-10 w-10 flex items-center justify-center"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
            
            <button
              onClick={stepForward}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Step forward"
              disabled={currentStep === steps.length - 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
            
            <button
              onClick={skipToEnd}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Skip to end"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
          </div>
          
          {/* Speed control */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-500">Slow</span>
            <input
              type="range"
              min="100"
              max="1000"
              step="100"
              value={playbackSpeed}
              onChange={handleSpeedChange}
              className="w-32"
            />
            <span className="text-sm text-gray-500">Fast</span>
          </div>
        </div>
      </div>
      
      {renderMetrics()}
    </div>
  );
};

SolverVisualizer.propTypes = {
  originalBoard: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.number)
  ).isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.arrayOf(PropTypes.number)
    )
  ),
  metrics: PropTypes.object,
  solverType: PropTypes.string
};

SolverVisualizer.defaultProps = {
  steps: [],
  metrics: null,
  solverType: 'Backtracking'
};

export default SolverVisualizer;