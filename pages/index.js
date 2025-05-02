import App from '../src/App';

/**
 * Main entry point for the Sudoku AI application
 */
export default function Home() {
  return <App />;
}

/**
 * This gets called at build time and provides static props to the page
 */
export async function getStaticProps() {
  return {
    props: {}, // Will be passed to the page component as props
  };
}
