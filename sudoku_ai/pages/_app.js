import React from 'react';
// Import all global CSS here
import '../src/index.css';
import '../src/App.css';
import '../src/components/Board.css';
import '../src/components/Visualizer.css';
import '../src/components/InstructionsPanel.css';
import '../src/components/ControlPanel.css';
import '../src/components/StatisticsPanel.css';
import '../src/components/ControlStatsPanel.css';
import Head from 'next/head';

/**
 * Custom Next.js App component
 * This component is used to initialize pages
 */
function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Sudoku AI Solver</title>
        <meta name="description" content="Sudoku puzzle solver with visualization and algorithm explanation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
