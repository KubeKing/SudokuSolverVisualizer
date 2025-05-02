import React, { useState, useEffect } from 'react';
import Visualizer from '../components/Visualizer';
import ApiService from '../services/api';

const Training = () => {
  const [trainingStatus, setTrainingStatus] = useState({
    status: 'idle',
    current_epoch: 0,
    total_epochs: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datasets, setDatasets] = useState([]);
  
  // Training parameters
  const [numPuzzles, setNumPuzzles] = useState(1000);
  const [difficulty, setDifficulty] = useState('medium');
  const [numEpochs, setNumEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [validationSplit, setValidationSplit] = useState(0.2);

  // Load training status and datasets on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const status = await ApiService.getTrainingStatus();
        setTrainingStatus(status);
        
        const datasetsResponse = await ApiService.listDatasets();
        setDatasets(datasetsResponse.datasets || []);
      } catch (err) {
        setError(`Error loading data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Subscribe to training status via WebSocket
  useEffect(() => {
    const ws = ApiService.connectToTrainingWebSocket();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'training_status') {
        setTrainingStatus(data.data);
      }
    };
    return () => ws.close();
  }, []);

  // Start training
  const handleStartTraining = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options = {
        numPuzzles,
        difficulty,
        numEpochs,
        batchSize,
        validationSplit
      };
      
      const response = await ApiService.startTraining(options);
      setTrainingStatus(response.status);
    } catch (err) {
      setError(`Error starting training: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Stop training
  const handleStopTraining = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ApiService.stopTraining();
      setTrainingStatus(response.status);
    } catch (err) {
      setError(`Error stopping training: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate dataset
  const handleGenerateDataset = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options = {
        numPuzzles,
        difficulty,
        outputDir: `${difficulty}_${numPuzzles}_custom`
      };
      
      await ApiService.generateDataset(options);
      
      // Refresh datasets list
      const datasetsResponse = await ApiService.listDatasets();
      setDatasets(datasetsResponse.datasets || []);
    } catch (err) {
      setError(`Error generating dataset: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get the training button text
  const getTrainingButtonText = () => {
    if (loading) return 'Processing...';
    
    switch (trainingStatus.status) {
      case 'training':
        return 'Stop Training';
      case 'preparing':
        return 'Preparing...';
      case 'completed':
        return 'Start New Training';
      case 'error':
        return 'Retry Training';
      case 'stopped':
        return 'Resume Training';
      default:
        return 'Start Training';
    }
  };

  // Handle training button click
  const handleTrainingButton = () => {
    if (trainingStatus.status === 'training' || trainingStatus.status === 'preparing') {
      handleStopTraining();
    } else {
      handleStartTraining();
    }
  };

  // Get training button color
  const getTrainingButtonColor = () => {
    if (trainingStatus.status === 'training' || trainingStatus.status === 'preparing') {
      return 'bg-red-500 hover:bg-red-600';
    }
    return 'bg-green-500 hover:bg-green-600';
  };

  // Format dataset name
  const formatDatasetName = (name) => {
    return name.replace(/_/g, ' ').replace(/(\d+)/g, ' $1 ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Train Sudoku AI Model</h1>
        <p className="text-gray-600">Train a neural network to solve Sudoku puzzles</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Training Parameters</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Puzzles
                </label>
                <input
                  type="number"
                  value={numPuzzles}
                  onChange={(e) => setNumPuzzles(Math.max(100, parseInt(e.target.value) || 100))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="100"
                  max="10000"
                  disabled={trainingStatus.status === 'training' || trainingStatus.status === 'preparing'}
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 1,000 - 5,000</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={trainingStatus.status === 'training' || trainingStatus.status === 'preparing'}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Epochs
                </label>
                <input
                  type="number"
                  value={numEpochs}
                  onChange={(e) => setNumEpochs(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  max="100"
                  disabled={trainingStatus.status === 'training' || trainingStatus.status === 'preparing'}
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 10 - 20</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Size
                </label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  max="128"
                  disabled={trainingStatus.status === 'training' || trainingStatus.status === 'preparing'}
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 32 - 64</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validation Split
                </label>
                <input
                  type="number"
                  value={validationSplit}
                  onChange={(e) => setValidationSplit(Math.max(0.1, Math.min(0.5, parseFloat(e.target.value) || 0.2)))}
                  className="w-full px-3 py-2 border rounded-md"
                  step="0.05"
                  min="0.1"
                  max="0.5"
                  disabled={trainingStatus.status === 'training' || trainingStatus.status === 'preparing'}
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 0.1 - 0.3</p>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={handleTrainingButton}
                  className={`w-full py-3 ${getTrainingButtonColor()} text-white rounded-md font-medium`}
                  disabled={loading}
                >
                  {getTrainingButtonText()}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Dataset Management</h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You can generate custom datasets for training. Larger datasets generally lead to better model performance.
              </p>
              
              <button
                onClick={handleGenerateDataset}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                disabled={loading || trainingStatus.status === 'training' || trainingStatus.status === 'preparing'}
              >
                Generate New Dataset
              </button>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Datasets:</h3>
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {datasets.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {datasets.map((dataset, index) => (
                        <li key={index} className="px-3 py-2 text-sm hover:bg-gray-50">
                          <div className="font-medium">
                            {formatDatasetName(dataset.name)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dataset.puzzle_count} puzzles • 
                            {dataset.metadata.difficulty ? ` ${dataset.metadata.difficulty} difficulty` : ''}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      No datasets available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Training Visualization</h2>
            
            <Visualizer isTraining={true} />
            
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-md font-medium text-gray-700 mb-2">Model Training Explanation</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  This visualizer shows the training progress of a Convolutional Neural Network (CNN) 
                  designed to solve Sudoku puzzles.
                </p>
                <p>
                  <strong>Training Accuracy</strong>: Shows how well the model predicts the correct 
                  digits on the training dataset.
                </p>
                <p>
                  <strong>Validation Accuracy</strong>: Shows how well the model generalizes to unseen 
                  Sudoku puzzles.
                </p>
                <p>
                  <strong>Loss</strong>: A measure of how far the model's predictions are from the 
                  correct solutions. Lower is better.
                </p>
                <p>
                  During training, the model learns patterns in Sudoku puzzles by analyzing thousands 
                  of examples. The trained model can then use these patterns to solve new puzzles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
