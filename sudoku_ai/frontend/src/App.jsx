import React, { useState, useEffect } from 'react';
import './App.css';
import Board from './components/Board';
import Visualizer from './components/Visualizer';
import InstructionsPanel from './components/InstructionsPanel';
import ControlPanel from './components/ControlPanel';
import { generatePuzzle, solvePuzzle, visualizeSolution } from './services/api';

function App() {
  // Game state
  const [mode, setMode] = useState('play'); // 'play' or 'solve'
  const [grid, setGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [solvedGrid, setSolvedGrid] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  
  // Visualization state
  const [visualizationSteps, setVisualizationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationSpeed, setVisualizationSpeed] = useState(500); // ms
  
  // Stats and UI state
  const [message, setMessage] = useState('');
  const [statistics, setStatistics] = useState({
    mistakes: 0,
    time: 0,
    filledCells: 0,
    totalCells: 81,
    complexity: 'Medium',
    steps: 0,
    minimumSteps: 0
  });
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  
  // Helper function to consistently calculate filled cells
  const calculateFilledCells = (grid) => {
    if (!grid || grid.length === 0) return 0;
    return grid.flat().filter(cell => cell !== 0).length;
  };

  // Generate a new puzzle on component mount or when difficulty changes
  useEffect(() => {
    handleNewGame();
  }, [difficulty]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (timerActive) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
        setStatistics(prev => ({
          ...prev,
          time: prev.time + 1
        }));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    
    return () => clearInterval(interval);
  }, [timerActive]);

  // Handle visualization steps
  useEffect(() => {
    if (isVisualizing && visualizationSteps.length > 0) {
      const visualizationTimer = setTimeout(() => {
        if (currentStepIndex < visualizationSteps.length - 1) {
          // Move to next step
          const newIndex = currentStepIndex + 1;
          setCurrentStepIndex(newIndex);
          
          // Get the current step's grid and update filledCells count
          const currentGrid = visualizationSteps[newIndex].grid;
          setStatistics(prev => ({
            ...prev,
            filledCells: calculateFilledCells(currentGrid)
          }));
          
          // If this is the last step, ensure we're showing the complete solution
          if (newIndex === visualizationSteps.length - 1) {
            const finalStep = visualizationSteps[visualizationSteps.length - 1];
            setSolvedGrid(finalStep.grid);
            
            // For the final step, ensure statistics reflect the actual state of the grid
            // rather than any hard-coded value
            setStatistics(prev => ({
              ...prev,
              filledCells: calculateFilledCells(finalStep.grid)
            }));
          }
        } else {
          setIsVisualizing(false);
          // Store the final solved grid from the last visualization step
          if (visualizationSteps.length > 0) {
            const finalStep = visualizationSteps[visualizationSteps.length - 1];
            setSolvedGrid(finalStep.grid);
          }
          setMessage('Visualization complete');
        }
      }, visualizationSpeed); // Speed of visualization from state
      
      return () => clearTimeout(visualizationTimer);
    }
  }, [currentStepIndex, visualizationSteps, isVisualizing, visualizationSpeed]);

  const handleNewGame = async () => {
    try {
      setMessage('Generating new puzzle...');
      const newGrid = await generatePuzzle(difficulty);
      setGrid(newGrid);
      setSolvedGrid(null);
      setVisualizationSteps([]);
      setCurrentStepIndex(0);
      setIsVisualizing(false);
      setShowVisualization(false);
      setTimer(0);
      setTimerActive(mode === 'play');
      
      // Reset statistics
      setStatistics({
        mistakes: 0,
        time: 0,
        filledCells: calculateFilledCells(newGrid),
        totalCells: 81,
        complexity: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        steps: 0,
        minimumSteps: 0
      });
      
      setMessage('Solve Mode');
    } catch (error) {
      setMessage('Error generating puzzle: ' + error.message);
    }
  };

  const handleCellChange = (row, col, value) => {
    if (mode === 'play') {
      const newGrid = [...grid];
      newGrid[row][col] = value;
      setGrid(newGrid);
      
      // Update statistics using our helper function
      setStatistics(prev => ({
        ...prev,
        filledCells: calculateFilledCells(newGrid)
      }));
      
      // Start timer if not already active
      if (!timerActive) {
        setTimerActive(true);
      }
    }
  };

  const handleSolve = async () => {
    try {
      setMessage('Solving puzzle...');
      const solved = await solvePuzzle(grid);
      
      if (solved.solved) {
        setSolvedGrid(solved.grid);
        
        // Update statistics
        setStatistics(prev => ({
          ...prev,
          mistakes: solved.mistakes || 0,
          steps: solved.steps || 0,
          minimumSteps: solved.minimumSteps || 0,
          filledCells: calculateFilledCells(solved.grid)
        }));
        
        setMessage('Puzzle solved successfully!');
      } else {
        setMessage('No solution exists for this puzzle.');
      }
    } catch (error) {
      setMessage('Error solving puzzle: ' + error.message);
    }
  };

  const handleVisualizeSolve = async () => {
    try {
      setMessage('Preparing visualization...');
      const result = await visualizeSolution(grid);
      
      if (result.solved && result.steps.length > 0) {
        setVisualizationSteps(result.steps);
        setCurrentStepIndex(0);
        setIsVisualizing(true);
        setShowVisualization(true);
        
        // Immediately set the final solution in the left panel
        // The last step in the visualization contains the complete solution
        const finalSolution = result.steps[result.steps.length - 1].grid;
        setSolvedGrid(finalSolution);
        
        // Update statistics - use the actual cells from the current step
        // rather than assuming all cells are filled
        const initialStep = result.steps[0];
        setStatistics(prev => ({
          ...prev,
          mistakes: result.mistakes || 0,
          steps: result.steps.length || 0,
          minimumSteps: result.minimumSteps || 0,
          filledCells: calculateFilledCells(initialStep.grid)
        }));
        
        setMessage('Visualizing solution...');
      } else {
        setMessage('No solution exists for this puzzle or no steps to visualize.');
      }
    } catch (error) {
      setMessage('Error visualizing solution: ' + error.message);
    }
  };

  const handleStopVisualization = () => {
    setIsVisualizing(false);
    
    // Update filled cells count based on the current step's grid
    if (visualizationSteps.length > 0 && currentStepIndex < visualizationSteps.length) {
      const currentGrid = visualizationSteps[currentStepIndex].grid;
      setStatistics(prev => ({
        ...prev,
        filledCells: calculateFilledCells(currentGrid)
      }));
      
      // If this is the last step when stopped, also update the solved grid
      if (currentStepIndex === visualizationSteps.length - 1) {
        setSolvedGrid(currentGrid);
      }
    }
    
    setMessage('Visualization paused');
  };

  const handleResumeVisualization = () => {
    setIsVisualizing(true);
    setMessage('Visualizing solution...');
  };

  const handleStepForward = () => {
    if (currentStepIndex < visualizationSteps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      
      // Update the filled cells count for the current step
      const currentGrid = visualizationSteps[newIndex].grid;
      setStatistics(prev => ({
        ...prev,
        filledCells: calculateFilledCells(currentGrid)
      }));
      
      // If this is the last step, also update the solved grid
      if (newIndex === visualizationSteps.length - 1) {
        setSolvedGrid(visualizationSteps[newIndex].grid);
      }
    }
  };

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      
      // Update the filled cells count for the current step
      const currentGrid = visualizationSteps[newIndex].grid;
      setStatistics(prev => ({
        ...prev,
        filledCells: calculateFilledCells(currentGrid)
      }));
    }
  };
  
  const handleSpeedChange = (newSpeed) => {
    setVisualizationSpeed(newSpeed);
  };

  // Get the current step description for the ControlStatsPanel
  const currentStepDescription = visualizationSteps[currentStepIndex]?.step || '';

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sudoku Solver with Dancing Links</h1>
        <div className="controls">
          <div className="mode-selector">
            <label>
              <input
                type="radio"
                value="play"
                checked={mode === 'play'}
                onChange={() => {
                  // When switching to play mode, keep the current board but reset other states
                  setMode('play');
                  setSolvedGrid(null);
                  setIsVisualizing(false);
                  setShowVisualization(false); // Hide visualization when switching to play mode
                  setTimerActive(true);
                }}
              />
              Play
            </label>
            <label>
              <input
                type="radio"
                value="solve"
                checked={mode === 'solve'}
                onChange={() => {
                  setMode('solve');
                  setTimerActive(false);
                }}
              />
              Solver
            </label>
          </div>
          
          <div className="difficulty-selector">
            <label htmlFor="difficulty">Difficulty:</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={mode === 'solve'}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <button onClick={handleNewGame} disabled={isVisualizing}>
            New Game
          </button>
          
          {mode === 'solve' && (
            <button onClick={handleVisualizeSolve} disabled={isVisualizing}>
              Solve
            </button>
          )}
        </div>
      </header>

      <main className="App-main">
        <div className="split-screen-container">
          {/* Left Panel - Always shows the main board */}
          <div className="left-panel">
            <div className="panel-content">
              <h3 className="panel-title">Sudoku Board</h3>
              <Board
                grid={solvedGrid || grid}
                initialGrid={grid}
                onCellChange={handleCellChange}
                readOnly={mode === 'solve' || !!solvedGrid}
              />
            </div>
          </div>
          
          {/* Right Panel - Shows either visualization or instructions */}
          <div className="right-panel">
            <div className="panel-content">
              {showVisualization && visualizationSteps.length > 0 ? (
                <Visualizer
                  step={visualizationSteps[currentStepIndex]}
                  currentIndex={currentStepIndex}
                  totalSteps={visualizationSteps.length}
                />
              ) : (
                <InstructionsPanel />
              )}
            </div>
          </div>
        </div>
        
        {/* Unified Control Panel */}
        <ControlPanel 
          statistics={statistics}
          isVisualizing={isVisualizing}
          visualizationActive={visualizationSteps.length > 0 && (mode === 'solve' || showVisualization)}
          currentStep={currentStepIndex}
          totalSteps={visualizationSteps.length}
          speed={visualizationSpeed}
          onStop={handleStopVisualization}
          onResume={handleResumeVisualization}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onSpeedChange={handleSpeedChange}
          stepDescription={(visualizationSteps.length > 0 && (mode === 'solve' || showVisualization)) ? currentStepDescription : ''}
        />
        
        <div className="message-container">
          <p>{mode === 'play' ? 'Play Mode' : message}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
