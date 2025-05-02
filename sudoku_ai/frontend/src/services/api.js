const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * API service for interacting with the Sudoku AI backend
 */
const ApiService = {
  /**
   * Get a new puzzle
   * @param {string} difficulty - Puzzle difficulty level ('easy', 'medium', 'hard', 'expert')
   * @returns {Promise<Object>} - Puzzle object
   */
  getNewPuzzle: async (difficulty = 'medium') => {
    try {
      const response = await fetch(`${API_URL}/puzzles/new?difficulty=${difficulty}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get new puzzle');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting new puzzle:', error);
      throw error;
    }
  },
  
  /**
   * Solve a puzzle using backtracking algorithm
   * @param {Object} board - Sudoku board object
   * @returns {Promise<Object>} - Solution object
   */
  solveWithBacktracking: async (board) => {
    try {
      const response = await fetch(`${API_URL}/solve/backtracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(board),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to solve puzzle with backtracking');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error solving with backtracking:', error);
      throw error;
    }
  },
  
  /**
   * Solve a puzzle using the ML model
   * @param {Object} board - Sudoku board object
   * @returns {Promise<Object>} - Solution object
   */
  solveWithML: async (board) => {
    try {
      const response = await fetch(`${API_URL}/solve/ml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(board),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to solve puzzle with ML model');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error solving with ML:', error);
      throw error;
    }
  },
  
  /**
   * Get training status
   * @returns {Promise<Object>} - Training status object
   */
  getTrainingStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/training/status`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get training status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting training status:', error);
      throw error;
    }
  },
  
  /**
   * Start model training
   * @param {Object} options - Training options
   * @param {number} options.numPuzzles - Number of puzzles to train on
   * @param {string} options.difficulty - Puzzle difficulty level
   * @param {number} options.numEpochs - Number of training epochs
   * @param {number} options.batchSize - Training batch size
   * @param {number} options.validationSplit - Validation split ratio
   * @returns {Promise<Object>} - Training start response
   */
  startTraining: async (options = {}) => {
    const {
      numPuzzles = 1000,
      difficulty = 'medium',
      numEpochs = 10,
      batchSize = 32,
      validationSplit = 0.2,
    } = options;
    
    try {
      const queryParams = new URLSearchParams({
        num_puzzles: numPuzzles,
        difficulty,
        num_epochs: numEpochs,
        batch_size: batchSize,
        validation_split: validationSplit,
      });
      
      const response = await fetch(`${API_URL}/training/start?${queryParams}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start training');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting training:', error);
      throw error;
    }
  },
  
  /**
   * Stop model training
   * @returns {Promise<Object>} - Training stop response
   */
  stopTraining: async () => {
    try {
      const response = await fetch(`${API_URL}/training/stop`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to stop training');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error stopping training:', error);
      throw error;
    }
  },
  
  /**
   * Generate a dataset of puzzles
   * @param {Object} options - Dataset generation options
   * @param {number} options.numPuzzles - Number of puzzles to generate
   * @param {string} options.difficulty - Puzzle difficulty level
   * @param {string} options.outputDir - Output directory name
   * @returns {Promise<Object>} - Dataset generation response
   */
  generateDataset: async (options = {}) => {
    const {
      numPuzzles = 1000,
      difficulty = 'medium',
      outputDir = 'default',
    } = options;
    
    try {
      const queryParams = new URLSearchParams({
        num_puzzles: numPuzzles,
        difficulty,
        output_dir: outputDir,
      });
      
      const response = await fetch(`${API_URL}/datasets/generate?${queryParams}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate dataset');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating dataset:', error);
      throw error;
    }
  },
  
  /**
   * List available datasets
   * @returns {Promise<Object>} - List of datasets
   */
  listDatasets: async () => {
    try {
      const response = await fetch(`${API_URL}/datasets/list`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to list datasets');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error listing datasets:', error);
      throw error;
    }
  },
  
  /**
   * Create WebSocket connection for training progress
   * @returns {WebSocket} - WebSocket connection
   */
  connectToTrainingWebSocket: () => {
    const wsUrl = `ws://${window.location.hostname}:8000/ws/training`;
    return new WebSocket(wsUrl);
  },
  
  /**
   * Create WebSocket connection for solving visualization
   * @returns {WebSocket} - WebSocket connection
   */
  connectToSolveWebSocket: () => {
    const wsUrl = `ws://${window.location.hostname}:8000/ws/solve`;
    return new WebSocket(wsUrl);
  },
};

export default ApiService;