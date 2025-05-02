import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Visualizer = ({ trainingData, isTraining }) => {
  const [chartData, setChartData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('accuracy');
  const wsRef = useRef(null);
  const [status, setStatus] = useState({
    status: 'idle',
    currentEpoch: 0,
    totalEpochs: 0,
    trainLoss: 0,
    trainAccuracy: 0,
    valLoss: 0,
    valAccuracy: 0
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (isTraining) {
      const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/training`);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
if (data.type === 'status' || data.type === 'training_status') {
          setStatus({
            status: data.data.status,
            currentEpoch: data.data.current_epoch,
            totalEpochs: data.data.total_epochs,
            trainLoss: data.data.train_loss,
            trainAccuracy: data.data.train_accuracy,
            valLoss: data.data.val_loss,
            valAccuracy: data.data.val_accuracy
          });
          
          // Update chart data
          const history = data.data.history;
          if (history && history.train_loss.length > 0) {
            const newChartData = history.train_loss.map((_, index) => ({
              epoch: index + 1,
              trainLoss: history.train_loss[index],
              valLoss: history.val_loss[index],
              trainAccuracy: history.train_accuracy[index],
              valAccuracy: history.val_accuracy[index]
            }));
            
            setChartData(newChartData);
          }
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      wsRef.current = ws;
      
      // Clean up WebSocket on unmount
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } else if (trainingData) {
      // Use provided training data
      const newChartData = trainingData.train_loss.map((_, index) => ({
        epoch: index + 1,
        trainLoss: trainingData.train_loss[index],
        valLoss: trainingData.val_loss[index],
        trainAccuracy: trainingData.train_accuracy[index],
        valAccuracy: trainingData.val_accuracy[index]
      }));
      
      setChartData(newChartData);
    }
  }, [isTraining, trainingData]);

  // Get status color
  const getStatusColor = () => {
    switch (status.status) {
      case 'training':
        return 'text-green-500';
      case 'preparing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-700';
      case 'error':
        return 'text-red-600';
      case 'stopped':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  // Toggle between accuracy and loss metrics
  const toggleMetric = () => {
    setSelectedMetric(selectedMetric === 'accuracy' ? 'loss' : 'accuracy');
  };

  // Format numbers
  const formatNumber = (num) => {
    return Number(num).toFixed(4);
  };

  // Get the chart based on selected metric
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500">No training data available</p>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="epoch" />
          <YAxis />
          <Tooltip 
            formatter={(value) => formatNumber(value)}
            labelFormatter={(value) => `Epoch ${value}`}
          />
          <Legend />
          {selectedMetric === 'accuracy' ? (
            <>
              <Line 
                type="monotone" 
                dataKey="trainAccuracy" 
                name="Training Accuracy" 
                stroke="#4CAF50" 
                activeDot={{ r: 8 }} 
              />
              <Line 
                type="monotone" 
                dataKey="valAccuracy" 
                name="Validation Accuracy" 
                stroke="#2196F3" 
              />
            </>
          ) : (
            <>
              <Line 
                type="monotone" 
                dataKey="trainLoss" 
                name="Training Loss" 
                stroke="#F44336" 
                activeDot={{ r: 8 }} 
              />
              <Line 
                type="monotone" 
                dataKey="valLoss" 
                name="Validation Loss" 
                stroke="#FF9800" 
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render the current training metrics
  const renderCurrentMetrics = () => {
    if (!isTraining) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Training Loss</h3>
          <p className="text-xl font-semibold">{formatNumber(status.trainLoss)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Validation Loss</h3>
          <p className="text-xl font-semibold">{formatNumber(status.valLoss)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Training Accuracy</h3>
          <p className="text-xl font-semibold">{formatNumber(status.trainAccuracy)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Validation Accuracy</h3>
          <p className="text-xl font-semibold">{formatNumber(status.valAccuracy)}</p>
        </div>
      </div>
    );
  };

  // Render progress bar
  const renderProgressBar = () => {
    if (!isTraining || status.totalEpochs === 0) return null;
    
    const progress = (status.currentEpoch / status.totalEpochs) * 100;
    
    return (
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-500">
            Progress: {status.currentEpoch} / {status.totalEpochs} epochs
          </span>
          <span className="text-sm font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
      {isTraining && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <span className={`font-medium ${getStatusColor()}`}>
              Status: {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </span>
            {status.status === 'training' && (
              <div className="ml-2 animate-pulse">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse-delay-200"></span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse-delay-400"></span>
              </div>
            )}
          </div>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={toggleMetric}
          >
            Show {selectedMetric === 'accuracy' ? 'Loss' : 'Accuracy'}
          </button>
        </div>
      )}
      
      {renderProgressBar()}
      {renderCurrentMetrics()}
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-4">
          {selectedMetric === 'accuracy' ? 'Accuracy Over Time' : 'Loss Over Time'}
        </h2>
        {renderChart()}
      </div>
    </div>
  );
};

Visualizer.propTypes = {
  trainingData: PropTypes.shape({
    train_loss: PropTypes.arrayOf(PropTypes.number),
    val_loss: PropTypes.arrayOf(PropTypes.number),
    train_accuracy: PropTypes.arrayOf(PropTypes.number),
    val_accuracy: PropTypes.arrayOf(PropTypes.number)
  }),
  isTraining: PropTypes.bool
};

Visualizer.defaultProps = {
  trainingData: null,
  isTraining: false
};

export default Visualizer;
