from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import asyncio
import uuid
import numpy as np
from typing import Dict, List, Optional
import uvicorn

from app.models.sudoku_board import SudokuBoard
from app.solvers.backtracking import BacktrackingSolver
from app.solvers.ml_solver import MLSolver
from app.utils.generator import PuzzleGenerator
from app.models.cnn_model import SudokuCNNTrainer, SudokuCNN

# Create the FastAPI app
app = FastAPI(title="Sudoku AI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create folders for data
os.makedirs("models", exist_ok=True)
os.makedirs("puzzles", exist_ok=True)
os.makedirs("datasets", exist_ok=True)

# Initialize solvers and generators
backtracking_solver = BacktrackingSolver()
puzzle_generator = PuzzleGenerator(cache_dir="puzzles")

# Global variables
active_connections = {}
training_progress = {
    "status": "idle",
    "current_epoch": 0,
    "total_epochs": 0,
    "train_loss": 0.0,
    "train_accuracy": 0.0,
    "val_loss": 0.0,
    "val_accuracy": 0.0,
    "history": {
        "train_loss": [],
        "val_loss": [],
        "train_accuracy": [],
        "val_accuracy": []
    }
}

# ML model and solver (initialized lazily)
ml_solver = None
model_trainer = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket
        return connection_id
    
    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
    
    async def send_json(self, connection_id: str, data: dict):
        if connection_id in self.active_connections:
            await self.active_connections[connection_id].send_json(data)
    
    async def broadcast_json(self, data: dict):
        for connection in self.active_connections.values():
            await connection.send_json(data)

# Create connection manager
manager = ConnectionManager()

# Helper function to initialize ML solver
def get_ml_solver():
    global ml_solver
    if ml_solver is None:
        try:
            # Determine model file (best or final)
            best_path = "models/best_model.pt"
            final_path = "models/final_model.pt"
            if os.path.exists(best_path):
                model_path = best_path
            elif os.path.exists(final_path):
                print("Best model not found, loading final model")
                model_path = final_path
            else:
                raise FileNotFoundError("No trained model found. Train a model first.")
            
            print(f"Initializing ML solver with model: {model_path}")
            ml_solver = MLSolver(
                model_path=model_path,
                use_backtracking=True
            )
        except Exception as e:
            print(f"Error initializing ML solver: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    return ml_solver

# Helper function to initialize model trainer
def get_model_trainer():
    global model_trainer
    if model_trainer is None:
        try:
            # Create a new trainer
            model = SudokuCNN()
            model_trainer = SudokuCNNTrainer(
                model=model,
                learning_rate=0.001,
                use_cuda=True,
                model_dir="models"
            )
            
            # Load pre-trained model if it exists
            if os.path.exists("models/best_model.pt"):
                model_trainer.load_model("best_model.pt")
        except Exception as e:
            print(f"Error initializing model trainer: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    return model_trainer

# Startup event
@app.on_event("startup")
async def startup_event():
    # Initialize puzzle cache
    print("Initializing puzzle cache...")
    for difficulty in ["easy", "medium", "hard", "expert"]:
        try:
            # Generate a few puzzles for each difficulty level
            puzzle_generator.generate_puzzle(difficulty)
        except Exception as e:
            print(f"Error generating {difficulty} puzzle: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    # Clean up resources
    print("Shutting down...")

# Root endpoint
@app.get("/")
async def read_root():
    return {"message": "Sudoku AI API is running"}

# Get a new puzzle
@app.get("/puzzles/new")
async def get_new_puzzle(difficulty: str = "medium"):
    try:
        if difficulty not in ["easy", "medium", "hard", "expert"]:
            raise HTTPException(status_code=400, detail="Invalid difficulty level")
        
        puzzle = puzzle_generator.generate_puzzle(difficulty)
        return puzzle.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Solve a puzzle using backtracking
@app.post("/solve/backtracking")
async def solve_with_backtracking(board_data: dict):
    try:
        board = SudokuBoard.from_dict(board_data)
        success, solutions = backtracking_solver.solve(board)
        
        if not success:
            return {
                "success": False,
                "message": "No solution found",
                "metrics": backtracking_solver.get_metrics()
            }
        
        return {
            "success": True,
            "solution": solutions[0].to_dict(),
            "metrics": backtracking_solver.get_metrics()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Solve a puzzle using ML model
@app.post("/solve/ml")
async def solve_with_ml(board_data: dict):
    try:
        solver = get_ml_solver()
        board = SudokuBoard.from_dict(board_data)
        success, solutions = solver.solve(board)
        
        if not success:
            return {
                "success": False,
                "message": "No solution found with ML solver",
                "metrics": solver.get_metrics()
            }
        
        return {
            "success": True,
            "solution": solutions[0].to_dict(),
            "metrics": solver.get_metrics()
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get training status
@app.get("/training/status")
async def get_training_status():
    return training_progress

# Start training
@app.post("/training/start")
async def start_training(
    num_puzzles: int = 1000,
    difficulty: str = "medium",
    num_epochs: int = 10,
    batch_size: int = 32,
    validation_split: float = 0.2
):
    global training_progress
    
    if training_progress["status"] != "idle":
        raise HTTPException(
            status_code=400, 
            detail="Training is already in progress"
        )
    
    # Reset training progress
    training_progress = {
        "status": "preparing",
        "current_epoch": 0,
        "total_epochs": num_epochs,
        "train_loss": 0.0,
        "train_accuracy": 0.0,
        "val_loss": 0.0,
        "val_accuracy": 0.0,
        "history": {
            "train_loss": [],
            "val_loss": [],
            "train_accuracy": [],
            "val_accuracy": []
        }
    }
    
    # Start training in a separate task
    asyncio.create_task(
        train_model(
            num_puzzles=num_puzzles,
            difficulty=difficulty,
            num_epochs=num_epochs,
            batch_size=batch_size,
            validation_split=validation_split
        )
    )
    
    return {"message": "Training started", "status": training_progress}

# Stop training
@app.post("/training/stop")
async def stop_training():
    global training_progress
    
    if training_progress["status"] not in ["training", "preparing"]:
        raise HTTPException(
            status_code=400, 
            detail="No training in progress"
        )
    
    training_progress["status"] = "stopping"
    return {"message": "Stopping training", "status": training_progress}

# Generate dataset
@app.post("/datasets/generate")
async def generate_dataset(
    num_puzzles: int = 1000,
    difficulty: str = "medium",
    output_dir: str = "default"
):
    if output_dir == "default":
        output_dir = f"datasets/{difficulty}_{num_puzzles}"
    else:
        output_dir = f"datasets/{output_dir}"
    
    # Start dataset generation in a separate task
    asyncio.create_task(
        generate_dataset_task(
            num_puzzles=num_puzzles,
            difficulty=difficulty,
            output_dir=output_dir
        )
    )
    
    return {
        "message": f"Started generating {num_puzzles} {difficulty} puzzles",
        "output_dir": output_dir
    }

# List available datasets
@app.get("/datasets/list")
async def list_datasets():
    datasets = []
    
    for dataset_dir in os.listdir("datasets"):
        dir_path = os.path.join("datasets", dataset_dir)
        if os.path.isdir(dir_path):
            # Try to load metadata
            metadata_path = os.path.join(dir_path, "metadata.json")
            metadata = {}
            
            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                except:
                    pass
            
            # Count puzzle files
            puzzle_count = len([f for f in os.listdir(dir_path) if f.startswith("puzzle_")])
            
            datasets.append({
                "name": dataset_dir,
                "puzzle_count": puzzle_count,
                "metadata": metadata
            })
    
    return {"datasets": datasets}

# WebSocket endpoint for training progress
@app.websocket("/ws/training")
async def websocket_training(websocket: WebSocket):
    connection_id = await manager.connect(websocket)
    
    try:
        # Send initial status
        await manager.send_json(connection_id, {
            "type": "status",
            "data": training_progress
        })
        
        # Keep connection alive
        while True:
            # Receive message (just to keep the connection alive)
            data = await websocket.receive_text()
            
            # Echo back status
            await manager.send_json(connection_id, {
                "type": "status",
                "data": training_progress
            })
    except WebSocketDisconnect:
        manager.disconnect(connection_id)

# WebSocket endpoint for solving visualization
@app.websocket("/ws/solve")
async def websocket_solve(websocket: WebSocket):
    connection_id = await manager.connect(websocket)
    
    try:
        while True:
            # Receive puzzle to solve
            data = await websocket.receive_json()
            
            if "type" not in data:
                continue
            
            if data["type"] == "solve":
                # Extract puzzle
                board_data = data.get("board", {})
                solver_type = data.get("solver", "backtracking")
                
                # Create board
                try:
                    board = SudokuBoard.from_dict(board_data)
                except Exception as e:
                    await manager.send_json(connection_id, {
                        "type": "error",
                        "message": str(e)
                    })
                    continue
                
                # Select solver
                if solver_type == "ml":
                    try:
                        solver = get_ml_solver()
                    except Exception as e:
                        await manager.send_json(connection_id, {
                            "type": "error",
                            "message": str(e)
                        })
                        continue
                else:
                    solver = backtracking_solver
                
                # Solve
                success, solutions = solver.solve(board)
                
                # Send result
                if success:
                    await manager.send_json(connection_id, {
                        "type": "solution",
                        "success": True,
                        "solution": solutions[0].to_dict(),
                        "metrics": solver.get_metrics()
                    })
                else:
                    await manager.send_json(connection_id, {
                        "type": "solution",
                        "success": False,
                        "message": "No solution found",
                        "metrics": solver.get_metrics()
                    })
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(connection_id)

# Background task to generate dataset
async def generate_dataset_task(
    num_puzzles: int,
    difficulty: str,
    output_dir: str
):
    try:
        # Create dataset directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate puzzles
        for i in range(num_puzzles):
            # Generate puzzle
            puzzle = puzzle_generator.generate_puzzle(difficulty)
            
            # Solve puzzle
            success, solutions = backtracking_solver.solve(puzzle)
            
            if success:
                # Save puzzle and solution
                puzzle_path = os.path.join(output_dir, f"puzzle_{i}.txt")
                solution_path = os.path.join(output_dir, f"solution_{i}.txt")
                
                with open(puzzle_path, 'w') as f:
                    f.write(puzzle.to_string())
                
                with open(solution_path, 'w') as f:
                    f.write(solutions[0].to_string())
            
            # Update progress every 10 puzzles
            if (i + 1) % 10 == 0:
                # Broadcast progress
                await manager.broadcast_json({
                    "type": "dataset_progress",
                    "total": num_puzzles,
                    "current": i + 1,
                    "output_dir": output_dir
                })
        
        # Save metadata
        metadata = {
            "difficulty": difficulty,
            "size": num_puzzles,
            "date": str(np.datetime64('now'))
        }
        
        with open(os.path.join(output_dir, "metadata.json"), 'w') as f:
            json.dump(metadata, f)
        
        # Broadcast completion
        await manager.broadcast_json({
            "type": "dataset_complete",
            "total": num_puzzles,
            "output_dir": output_dir
        })
    except Exception as e:
        print(f"Error generating dataset: {e}")
        await manager.broadcast_json({
            "type": "dataset_error",
            "message": str(e)
        })

# Background task to train model
async def train_model(
    num_puzzles: int,
    difficulty: str,
    num_epochs: int,
    batch_size: int,
    validation_split: float
):
    global training_progress
    
    try:
        print("\n----- TRAINING PROCESS STARTING -----")
        print(f"Training parameters: {num_puzzles} {difficulty} puzzles, {num_epochs} epochs, batch size {batch_size}")
        
        # Update status
        training_progress["status"] = "preparing"
        training_progress["total_epochs"] = num_epochs
        print("Training status set to 'preparing'")
        
        # Broadcast status
        await manager.broadcast_json({
            "type": "training_status",
            "data": training_progress
        })
        
        # Check if we need to generate a dataset
        dataset_dir = f"datasets/{difficulty}_{num_puzzles}"
        if not os.path.exists(dataset_dir):
            print(f"Dataset {dataset_dir} not found, generating new dataset...")
            # Generate dataset
            await generate_dataset_task(
                num_puzzles=num_puzzles,
                difficulty=difficulty,
                output_dir=dataset_dir
            )
        else:
            print(f"Using existing dataset: {dataset_dir}")
        
        # Load dataset
        print("Loading dataset...")
        from app.utils.generator import load_dataset
        dataset = load_dataset(dataset_dir)
        print(f"Dataset loaded with {len(dataset)} puzzle-solution pairs")
        
        # Split dataset
        train_size = int(len(dataset) * (1 - validation_split))
        train_dataset = dataset[:train_size]
        val_dataset = dataset[train_size:]
        print(f"Dataset split: {len(train_dataset)} training samples, {len(val_dataset)} validation samples")
        
        # Initialize model trainer
        print("Initializing model trainer...")
        trainer = get_model_trainer()
        print("Model trainer initialized successfully")
        
        # Custom training function
        async def custom_train():
            nonlocal trainer, train_dataset, val_dataset, num_epochs, batch_size
            
            print("\n----- BEGINNING TRAINING LOOP -----")
            for epoch in range(num_epochs):
                print(f"\nStarting epoch {epoch+1}/{num_epochs}")
                # Check if training was stopped
                if training_progress["status"] == "stopping":
                    training_progress["status"] = "stopped"
                    break
                
                # Update status
                training_progress["status"] = "training"
                training_progress["current_epoch"] = epoch + 1
                
                # Train for one epoch
                train_metrics = trainer.train_epoch(train_dataset, batch_size)
                val_metrics = trainer.evaluate(val_dataset, batch_size)
                
                # Update progress
                training_progress["train_loss"] = train_metrics["loss"]
                training_progress["train_accuracy"] = train_metrics["accuracy"]
                training_progress["val_loss"] = val_metrics["loss"]
                training_progress["val_accuracy"] = val_metrics["accuracy"]
                
                # Update history
                training_progress["history"]["train_loss"].append(train_metrics["loss"])
                training_progress["history"]["train_accuracy"].append(train_metrics["accuracy"])
                training_progress["history"]["val_loss"].append(val_metrics["loss"])
                training_progress["history"]["val_accuracy"].append(val_metrics["accuracy"])
                
                # Broadcast status
                await manager.broadcast_json({
                    "type": "training_status",
                    "data": training_progress
                })
                
                # Save best model
                if len(trainer.val_accuracies) > 0:
                    current_acc = val_metrics["accuracy"]
                    best_acc = max(trainer.val_accuracies[:-1]) if len(trainer.val_accuracies) > 1 else 0
                    
                    if current_acc > best_acc:
                        print(f"Saving best model with validation accuracy: {current_acc:.4f}")
                        trainer.save_model("best_model.pt")
                        
                        # Broadcast best model update
                        await manager.broadcast_json({
                            "type": "model_saved",
                            "message": f"Saved best model with validation accuracy: {current_acc:.4f}"
                        })
                
                # Allow other tasks to run
                print("Waiting for next epoch...")
                await asyncio.sleep(0.1)
            
            # Save final model
            print("Training complete! Saving final model...")
            trainer.save_model("final_model.pt")
            
            # Update status
            if training_progress["status"] != "stopped":
                training_progress["status"] = "completed"
                print("Training status updated to 'completed'")
            
            # Broadcast final status
            print("Broadcasting final training status...")
            await manager.broadcast_json({
                "type": "training_status",
                "data": training_progress
            })
            
            # Reset ML solver to use the new model
            print("Resetting ML solver to use the new model for future predictions")
            global ml_solver
            ml_solver = None
        
        # Start custom training
        await custom_train()
    except Exception as e:
        print(f"Error training model: {e}")
        
        # Update status
        training_progress["status"] = "error"
        
        # Broadcast error
        await manager.broadcast_json({
            "type": "training_error",
            "message": str(e)
        })

# Run the server
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
