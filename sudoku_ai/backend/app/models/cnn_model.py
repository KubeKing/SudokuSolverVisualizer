import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import numpy as np
from typing import List, Tuple, Dict, Optional
import os
import time
from tqdm import tqdm
import matplotlib.pyplot as plt

from ..models.sudoku_board import SudokuBoard

class SudokuCNN(nn.Module):
    """
    A Convolutional Neural Network for solving Sudoku puzzles.
    """
    
    def __init__(self, num_layers: int = 10, filters: int = 64):
        """
        Initialize the CNN model.
        
        Args:
            num_layers: Number of convolutional layers
            filters: Number of filters in each convolutional layer
        """
        super(SudokuCNN, self).__init__()
        
        # Input layer: 9x9x9 -> 9x9xfilters
        # 9x9x9 represents a one-hot encoding of the board
        self.conv_in = nn.Conv2d(9, filters, kernel_size=3, padding=1)
        self.bn_in = nn.BatchNorm2d(filters)
        
        # Intermediate layers
        self.layers = nn.ModuleList([
            nn.Sequential(
                nn.Conv2d(filters, filters, kernel_size=3, padding=1),
                nn.BatchNorm2d(filters),
                nn.ReLU()
            ) for _ in range(num_layers)
        ])
        
        # Output layer: 9x9xfilters -> 9x9x9
        self.conv_out = nn.Conv2d(filters, 9, kernel_size=3, padding=1)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass of the CNN.
        
        Args:
            x: Input tensor of shape (batch_size, 9, 9, 9)
        
        Returns:
            Output tensor of shape (batch_size, 9, 9, 9)
        """
        # Input layer
        x = x.permute(0, 3, 1, 2)  # (batch_size, 9, 9, 9) -> (batch_size, 9, 9, 9)
        x = F.relu(self.bn_in(self.conv_in(x)))
        
        # Intermediate layers with residual connections
        for layer in self.layers:
            x = x + layer(x)
        
        # Output layer
        x = self.conv_out(x)
        
        # Return to original shape
        x = x.permute(0, 2, 3, 1)  # (batch_size, 9, 9, 9) -> (batch_size, 9, 9, 9)
        
        return x


class SudokuCNNTrainer:
    """
    A class to train and evaluate a Sudoku CNN model.
    """
    
    def __init__(self, 
                model: Optional[SudokuCNN] = None,
                learning_rate: float = 0.001,
                use_cuda: bool = True,
                model_dir: str = "models"):
        """
        Initialize the trainer.
        
        Args:
            model: SudokuCNN instance. If None, a new model is created.
            learning_rate: Learning rate for the optimizer
            use_cuda: Whether to use CUDA for training
            model_dir: Directory to save models
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() and use_cuda else "cpu")
        print(f"Using device: {self.device}")
        
        if model is None:
            self.model = SudokuCNN()
        else:
            self.model = model
        
        self.model.to(self.device)
        self.optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
        self.loss_fn = nn.CrossEntropyLoss()
        self.model_dir = model_dir
        
        os.makedirs(model_dir, exist_ok=True)
        
        # Training metrics
        self.train_losses = []
        self.val_losses = []
        self.train_accuracies = []
        self.val_accuracies = []
    
    def _prepare_batch(self, boards: List[SudokuBoard], 
                      solutions: List[SudokuBoard]) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Prepare a batch of Sudoku boards for training.
        
        Args:
            boards: List of SudokuBoard instances
            solutions: List of solution SudokuBoard instances
        
        Returns:
            Tuple of (inputs, targets) tensors
        """
        batch_size = len(boards)
        
        # Initialize tensors
        inputs = np.zeros((batch_size, 9, 9, 9), dtype=np.float32)
        targets = np.zeros((batch_size, 9, 9), dtype=np.int64)
        
        # Fill tensors
        for i, (board, solution) in enumerate(zip(boards, solutions)):
            # Input: one-hot encoding of board
            for row in range(9):
                for col in range(9):
                    value = board.board[row, col]
                    if value > 0:
                        # For filled cells, use one-hot encoding
                        inputs[i, row, col, value-1] = 1
                    else:
                        # For empty cells, use valid moves encoding
                        valid_moves = board.get_valid_moves(row, col)
                        for value in valid_moves:
                            inputs[i, row, col, value-1] = 1
            
            # Target: solution values (0-8)
            targets[i] = solution.board - 1  # Convert 1-9 to 0-8
        
        # Convert to PyTorch tensors
        inputs_tensor = torch.tensor(inputs, device=self.device)
        targets_tensor = torch.tensor(targets, device=self.device)
        
        return inputs_tensor, targets_tensor
    
    def train_epoch(self, 
                   train_dataset: List[Tuple[SudokuBoard, SudokuBoard]],
                   batch_size: int = 32) -> Dict[str, float]:
        """
        Train the model for one epoch.
        
        Args:
            train_dataset: List of (puzzle, solution) pairs
            batch_size: Batch size
        
        Returns:
            Dictionary of training metrics
        """
        self.model.train()
        total_loss = 0
        correct = 0
        total_cells = 0
        
        # Shuffle the dataset
        np.random.shuffle(train_dataset)
        
        # Create batches
        num_batches = len(train_dataset) // batch_size
        
        for i in tqdm(range(num_batches), desc="Training"):
            # Get a batch
            batch_start = i * batch_size
            batch_end = (i + 1) * batch_size
            batch = train_dataset[batch_start:batch_end]
            
            # Split into inputs and targets
            boards, solutions = zip(*batch)
            
            # Prepare the batch
            inputs, targets = self._prepare_batch(boards, solutions)
            
            # Zero the gradients
            self.optimizer.zero_grad()
            
            # Forward pass
            outputs = self.model(inputs)
            
            # Calculate loss
            loss = self.loss_fn(outputs.reshape(-1, 9), targets.reshape(-1))
            
            # Backward pass
            loss.backward()
            
            # Update parameters
            self.optimizer.step()
            
            # Calculate accuracy
            predictions = outputs.reshape(-1, 9).argmax(dim=1)
            targets_flat = targets.reshape(-1)
            correct += (predictions == targets_flat).sum().item()
            total_cells += targets_flat.numel()
            
            # Accumulate loss
            total_loss += loss.item()
        
        # Calculate metrics
        avg_loss = total_loss / num_batches
        accuracy = correct / total_cells if total_cells > 0 else 0
        
        return {
            "loss": avg_loss,
            "accuracy": accuracy
        }
    
    def evaluate(self, 
               val_dataset: List[Tuple[SudokuBoard, SudokuBoard]],
               batch_size: int = 32) -> Dict[str, float]:
        """
        Evaluate the model on a validation dataset.
        
        Args:
            val_dataset: List of (puzzle, solution) pairs
            batch_size: Batch size
        
        Returns:
            Dictionary of validation metrics
        """
        self.model.eval()
        total_loss = 0
        correct = 0
        total_cells = 0
        
        # Create batches
        num_batches = len(val_dataset) // batch_size
        
        with torch.no_grad():
            for i in tqdm(range(num_batches), desc="Validating"):
                # Get a batch
                batch_start = i * batch_size
                batch_end = (i + 1) * batch_size
                batch = val_dataset[batch_start:batch_end]
                
                # Split into inputs and targets
                boards, solutions = zip(*batch)
                
                # Prepare the batch
                inputs, targets = self._prepare_batch(boards, solutions)
                
                # Forward pass
                outputs = self.model(inputs)
                
                # Calculate loss
                loss = self.loss_fn(outputs.reshape(-1, 9), targets.reshape(-1))
                
                # Calculate accuracy
                predictions = outputs.reshape(-1, 9).argmax(dim=1)
                targets_flat = targets.reshape(-1)
                correct += (predictions == targets_flat).sum().item()
                total_cells += targets_flat.numel()
                
                # Accumulate loss
                total_loss += loss.item()
        
        # Calculate metrics
        avg_loss = total_loss / num_batches if num_batches > 0 else 0
        accuracy = correct / total_cells if total_cells > 0 else 0
        
        return {
            "loss": avg_loss,
            "accuracy": accuracy
        }
    
    def train(self, 
             train_dataset: List[Tuple[SudokuBoard, SudokuBoard]],
             val_dataset: List[Tuple[SudokuBoard, SudokuBoard]],
             num_epochs: int = 10,
             batch_size: int = 32,
             save_best: bool = True) -> Dict[str, List[float]]:
        """
        Train the model for multiple epochs.
        
        Args:
            train_dataset: List of (puzzle, solution) pairs for training
            val_dataset: List of (puzzle, solution) pairs for validation
            num_epochs: Number of epochs to train
            batch_size: Batch size
            save_best: Whether to save the best model
        
        Returns:
            Dictionary of training history
        """
        print(f"Starting training for {num_epochs} epochs...")
        print(f"Training dataset size: {len(train_dataset)}")
        print(f"Validation dataset size: {len(val_dataset)}")
        
        best_val_accuracy = 0
        start_time = time.time()
        
        for epoch in range(num_epochs):
            epoch_start_time = time.time()
            
            # Train
            train_metrics = self.train_epoch(train_dataset, batch_size)
            
            # Evaluate
            val_metrics = self.evaluate(val_dataset, batch_size)
            
            # Record metrics
            self.train_losses.append(train_metrics["loss"])
            self.val_losses.append(val_metrics["loss"])
            self.train_accuracies.append(train_metrics["accuracy"])
            self.val_accuracies.append(val_metrics["accuracy"])
            
            # Print metrics
            epoch_time = time.time() - epoch_start_time
            print(f"Epoch {epoch+1}/{num_epochs} - {epoch_time:.2f}s - "
                  f"Train Loss: {train_metrics['loss']:.4f} - "
                  f"Train Acc: {train_metrics['accuracy']:.4f} - "
                  f"Val Loss: {val_metrics['loss']:.4f} - "
                  f"Val Acc: {val_metrics['accuracy']:.4f}")
            
            # Save the best model
            if save_best and val_metrics["accuracy"] > best_val_accuracy:
                best_val_accuracy = val_metrics["accuracy"]
                self.save_model("best_model.pt")
                print(f"Saved best model with validation accuracy: {best_val_accuracy:.4f}")
        
        # Save the final model
        self.save_model("final_model.pt")
        
        total_time = time.time() - start_time
        print(f"Training completed in {total_time:.2f}s")
        
        # Return training history
        return {
            "train_loss": self.train_losses,
            "val_loss": self.val_losses,
            "train_accuracy": self.train_accuracies,
            "val_accuracy": self.val_accuracies
        }
    
    def save_model(self, filename: str) -> None:
        """
        Save the model to a file.
        
        Args:
            filename: Name of the file to save the model to
        """
        filepath = os.path.join(self.model_dir, filename)
        torch.save({
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "train_losses": self.train_losses,
            "val_losses": self.val_losses,
            "train_accuracies": self.train_accuracies,
            "val_accuracies": self.val_accuracies
        }, filepath)
    
    def load_model(self, filename: str) -> None:
        """
        Load the model from a file.
        
        Args:
            filename: Name of the file to load the model from
        """
        filepath = os.path.join(self.model_dir, filename)
        checkpoint = torch.load(filepath, map_location=self.device)
        
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        
        self.train_losses = checkpoint.get("train_losses", [])
        self.val_losses = checkpoint.get("val_losses", [])
        self.train_accuracies = checkpoint.get("train_accuracies", [])
        self.val_accuracies = checkpoint.get("val_accuracies", [])
    
    def plot_training_history(self) -> Tuple[plt.Figure, plt.Figure]:
        """
        Plot the training history.
        
        Returns:
            Tuple of (loss_figure, accuracy_figure)
        """
        epochs = range(1, len(self.train_losses) + 1)
        
        # Plot losses
        loss_fig, loss_ax = plt.subplots(figsize=(10, 6))
        loss_ax.plot(epochs, self.train_losses, 'b-', label='Training Loss')
        loss_ax.plot(epochs, self.val_losses, 'r-', label='Validation Loss')
        loss_ax.set_title('Training and Validation Loss')
        loss_ax.set_xlabel('Epoch')
        loss_ax.set_ylabel('Loss')
        loss_ax.legend()
        loss_ax.grid(True)
        
        # Plot accuracies
        acc_fig, acc_ax = plt.subplots(figsize=(10, 6))
        acc_ax.plot(epochs, self.train_accuracies, 'b-', label='Training Accuracy')
        acc_ax.plot(epochs, self.val_accuracies, 'r-', label='Validation Accuracy')
        acc_ax.set_title('Training and Validation Accuracy')
        acc_ax.set_xlabel('Epoch')
        acc_ax.set_ylabel('Accuracy')
        acc_ax.legend()
        acc_ax.grid(True)
        
        return loss_fig, acc_fig
    
    def solve_puzzle(self, board: SudokuBoard) -> SudokuBoard:
        """
        Solve a Sudoku puzzle using the trained model.
        
        Args:
            board: SudokuBoard instance to solve
        
        Returns:
            SudokuBoard instance with the solution
        """
        self.model.eval()
        
        # Create a copy of the board to modify
        solution_board = board.copy()
        
        # Keep track of steps
        solution_board.steps = [solution_board.board.copy()]
        
        # Prepare input
        inputs = np.zeros((1, 9, 9, 9), dtype=np.float32)
        
        # Fill input with features
        for row in range(9):
            for col in range(9):
                value = board.board[row, col]
                if value > 0:
                    # For filled cells, use one-hot encoding
                    inputs[0, row, col, value-1] = 1
                else:
                    # For empty cells, use valid moves encoding
                    valid_moves = board.get_valid_moves(row, col)
                    for value in valid_moves:
                        inputs[0, row, col, value-1] = 1
        
        inputs_tensor = torch.tensor(inputs, device=self.device)
        
        # Get predictions
        with torch.no_grad():
            outputs = self.model(inputs_tensor)
            
        # Convert to numpy
        outputs_np = outputs.cpu().numpy()[0]
        
        # Make predictions for empty cells
        empty_cells = board.get_empty_cells()
        for row, col in empty_cells:
            # Get the predicted value (1-9)
            value = outputs_np[row, col].argmax() + 1
            
            # Set the value in the solution board
            solution_board.board[row, col] = value
            
            # Record the step
            solution_board.steps.append(solution_board.board.copy())
        
        return solution_board
    
    def visualize_solution(self, 
                         original_board: SudokuBoard, 
                         solution_board: SudokuBoard) -> plt.Figure:
        """
        Visualize the model's solution to a Sudoku puzzle.
        
        Args:
            original_board: Original SudokuBoard instance
            solution_board: Solution SudokuBoard instance
        
        Returns:
            Matplotlib figure
        """
        fig, axs = plt.subplots(1, 2, figsize=(12, 6))
        
        # Plot original board
        self._plot_board(axs[0], original_board.board, "Original Puzzle")
        
        # Plot solution board
        self._plot_board(axs[1], solution_board.board, "Model Solution")
        
        plt.tight_layout()
        return fig
    
    def _plot_board(self, ax: plt.Axes, board: np.ndarray, title: str) -> None:
        """
        Plot a Sudoku board on a Matplotlib axis.
        
        Args:
            ax: Matplotlib axis to plot on
            board: Numpy array representing the board
            title: Title for the plot
        """
        # Draw grid
        ax.set_xlim(0, 9)
        ax.set_ylim(0, 9)
        ax.set_aspect('equal')
        ax.set_title(title)
        
        # Remove ticks
        ax.set_xticks([])
        ax.set_yticks([])
        
        # Draw grid lines
        for i in range(10):
            lw = 2 if i % 3 == 0 else 0.5
            ax.axhline(i, color='black', linewidth=lw)
            ax.axvline(i, color='black', linewidth=lw)
        
        # Add numbers
        for row in range(9):
            for col in range(9):
                value = int(board[row, col])
                if value > 0:
                    ax.text(col + 0.5, 8.5 - row, str(value),
                          ha='center', va='center', fontsize=16)