import React, { useState, useEffect } from 'react';
import Board from '../components/Board';
import SolverVisualizer from '../components/SolverVisualizer';
import ApiService from '../services/api';

const Game = () => {
  const [puzzle, setPuzzle] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solution, setSolution] = useState(null);
  const [solutionMetrics, setSolutionMetrics] = useState(null);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [solverType, setSolverType] = useState('backtracking');
  const [solved, setSolved] = useState(false);
  const [boardState, setBoardState] = useState(null);

  // Load a new puzzle
  const loadPuzzle = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowSolution(false);
      setSolution(null);
      setSolutionMetrics(null);
      setSolved(false);
      
      const newPuzzle = await ApiService.getNewPuzzle(difficulty);
      setPuzzle(newPuzzle);
      setBoardState(newPuzzle.board);
    } catch (err) {
      setError(`Error loading puzzle: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load puzzle on component mount and when difficulty changes
  useEffect(() => {
    loadPuzzle();
  }, [difficulty]);

  // Handle move by player
  const handleMove = (row, col, value, newBoardState) => {
    setBoardState(newBoardState);
  };

  // Handle puzzle solved by player
  const handleSolved = () => {
    setSolved(true);
  };

  // Solve the puzzle using the selected solver
  const handleSolve = async () => {
    if (!puzzle) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let solutionResult;
      
      if (solverType === 'ml') {
        solutionResult = await ApiService.solveWithML(puzzle);
      } else {
        solutionResult = await ApiService.solveWithBacktracking(puzzle);
      }
      
      if (solutionResult.success) {
        setSolution(solutionResult.solution);
        setSolutionMetrics(solutionResult.metrics);
        setShowSolution(true);
      } else {
        setError(`No solution found: ${solutionResult.message}`);
      }
    } catch (err) {
      setError(`Error solving puzzle: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle hints
  const toggleHints = () => {
    setHintsEnabled(!hintsEnabled);
  };

  // Restart the current puzzle
  const restartPuzzle = () => {
    if (puzzle) {
      setBoardState(puzzle.board.map(row => [...row]));
      setShowSolution(false);
      setSolved(false);
    }
  };

  // Handle difficulty change
  const handleDifficultyChange = (event) => {
    setDifficulty(event.target.value);
  };

  // Handle solver type change
  const handleSolverTypeChange = (event) => {
    setSolverType(event.target.value);
  };

  // Render loading state
  if (loading && !puzzle) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Sudoku AI</h1>
        <p className="text-gray-600">Play Sudoku or watch the AI solve it</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between mb-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-800">
                  {solved ? "Puzzle Solved! 🎉" : "Play Sudoku"}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Difficulty:</span>
                  <select
                    value={difficulty}
                    onChange={handleDifficultyChange}
                    className="py-1 px-2 border rounded text-sm"
                    disabled={loading}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
              
              <div className="space-x-2">
                <button 
                  onClick={restartPuzzle}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm"
                  disabled={loading || !puzzle}
                >
                  Restart
                </button>
                <button 
                  onClick={loadPuzzle}
                  className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                  disabled={loading}
                >
                  New Puzzle
                </button>
              </div>
            </div>
            
            {puzzle && boardState && (
              <div className="flex justify-center">
                <Board 
                  board={boardState}
                  originalBoard={puzzle.original_board}
                  solution={solution ? solution.board : null}
                  onMove={handleMove}
                  onSolved={handleSolved}
                  readOnly={showSolution}
                  showHints={hintsEnabled}
                />
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Solve with AI</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Solver Type:</span>
                <select
                  value={solverType}
                  onChange={handleSolverTypeChange}
                  className="py-1 px-2 border rounded text-sm"
                  disabled={loading}
                >
                  <option value="backtracking">Backtracking Algorithm</option>
                  <option value="ml">Machine Learning Model</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleSolve}
                  className="py-2 px-6 bg-green-500 hover:bg-green-600 text-white rounded-md"
                  disabled={loading || !puzzle}
                >
                  {loading ? 'Solving...' : 'Solve Puzzle'}
                </button>
                
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={hintsEnabled}
                    onChange={toggleHints}
                    className="h-4 w-4 text-blue-500"
                  />
                  <span>Show Hints</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {showSolution && solution && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Solution Visualization
              </h2>
              
              <SolverVisualizer
                originalBoard={puzzle.original_board}
                steps={solution.steps}
                metrics={solutionMetrics}
                solverType={solverType === 'ml' ? 'Machine Learning' : 'Backtracking'}
              />
            </div>
          )}
          
          {!showSolution && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Play</h2>
              
              <div className="space-y-3 text-gray-700">
                <p>
                  <span className="font-medium">Select a cell</span> by clicking on it. 
                  The selected cell will be highlighted in blue.
                </p>
                
                <p>
                  <span className="font-medium">Enter a number</span> by pressing 1-9 on your keyboard
                  or by using the number buttons below the board.
                </p>
                
                <p>
                  <span className="font-medium">Pencil Mode</span> allows you to make notes in cells.
                  Toggle it on/off by clicking the pencil button.
                </p>
                
                <p>
                  <span className="font-medium">Hints</span> can show you the correct number 
                  for each cell. Toggle them on with the checkbox.
                </p>
                
                <p>
                  <span className="font-medium">AI Solve</span> lets you watch the AI solve the 
                  puzzle using different algorithms. Try both to compare their performance!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;