# Sudoku AI Solver - Vercel Deployment Guide

This application has been restructured to be deployed on Vercel. It uses Next.js with integrated API routes that replace the Python backend functionality.

## Project Structure

- `lib/` - Core algorithms converted from Python to JavaScript
  - `dlx.js` - Dancing Links algorithm implementation
  - `sudokuSolver.js` - Sudoku solving/generation functions

- `pages/` - Next.js pages and API routes
  - `index.js` - Main application page
  - `_app.js` - Custom App component
  - `api/` - Serverless API routes
    - `solve.js` - Endpoint for solving Sudoku puzzles
    - `visualize.js` - Endpoint for step-by-step solution visualization
    - `validate.js` - Endpoint for validating Sudoku grids
    - `generate.js` - Endpoint for generating puzzles


### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The development server will be available at `http://localhost:3000`.