import axios from 'axios';

// Base URL for API
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generate a new Sudoku puzzle
 * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard')
 * @param {number} size - Size of the grid (default: 9)
 * @returns {Promise<Array<Array<number>>>} - 2D array representing the puzzle
 */
export const generatePuzzle = async (difficulty = 'medium', size = 9) => {
  try {
    const response = await api.post('/generate', { difficulty, size });
    return response.data.grid;
  } catch (error) {
    console.error('Error generating puzzle:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate puzzle');
  }
};

/**
 * Solve a Sudoku puzzle
 * @param {Array<Array<number>>} grid - 2D array representing the puzzle
 * @param {number} size - Size of the grid (default: 9)
 * @returns {Promise<Object>} - Object containing solved grid and status
 */
export const solvePuzzle = async (grid, size = 9) => {
  try {
    const response = await api.post('/solve', { grid, size });
    return response.data;
  } catch (error) {
    console.error('Error solving puzzle:', error);
    throw new Error(error.response?.data?.message || 'Failed to solve puzzle');
  }
};

/**
 * Visualize the solution process
 * @param {Array<Array<number>>} grid - 2D array representing the puzzle
 * @param {number} size - Size of the grid (default: 9)
 * @returns {Promise<Object>} - Object containing visualization steps
 */
export const visualizeSolution = async (grid, size = 9) => {
  try {
    const response = await api.post('/visualize', { grid, size });
    return response.data;
  } catch (error) {
    console.error('Error visualizing solution:', error);
    throw new Error(error.response?.data?.message || 'Failed to visualize solution');
  }
};

/**
 * Validate a Sudoku grid
 * @param {Array<Array<number>>} grid - 2D array representing the puzzle
 * @param {number} size - Size of the grid (default: 9)
 * @returns {Promise<Object>} - Object containing validation result
 */
export const validateGrid = async (grid, size = 9) => {
  try {
    const response = await api.post('/validate', { grid, size });
    return response.data;
  } catch (error) {
    console.error('Error validating grid:', error);
    throw new Error(error.response?.data?.message || 'Failed to validate grid');
  }
};

export default api;
