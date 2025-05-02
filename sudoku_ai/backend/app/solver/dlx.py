"""
Implementation of Knuth's Algorithm X with Dancing Links for solving exact cover problems.
Based on Donald Knuth's paper "Dancing Links" and the pseudocode provided.
"""
from typing import List, Dict, Optional, Set, Tuple
import math

class Node:
    """A node in the Dancing Links structure representing a '1' in the exact cover matrix."""
    
    def __init__(self, column=None):
        """Initialize a node with links to left, right, up, down, and column."""
        self.left = self  # Circular links pointing to self initially
        self.right = self
        self.up = self
        self.down = self
        self.column = column  # Points to column header
    
    def append_to_row(self, node):
        """Append node to the right of this node in the same row."""
        node.right = self.right
        node.left = self
        self.right.left = node
        self.right = node
    
    def append_to_column(self, node):
        """Append node below this node in the same column."""
        node.down = self.down
        node.up = self
        self.down.up = node
        self.down = node


class Column(Node):
    """A column header node for the Dancing Links structure."""
    
    def __init__(self, name: str = ""):
        """Initialize a column header with size and name."""
        super().__init__(self)  # Column header is its own column
        self.size = 0  # Number of nodes in this column
        self.name = name  # Identifier (for decoding solutions)


class DancingLinks:
    """Implementation of Knuth's Dancing Links algorithm for exact cover problems."""
    
    def __init__(self):
        """Initialize the dancing links structure with a root column header."""
        self.root = Column("root")  # Create root header
        self.solution = []  # Rows in the current solution
        self.all_solutions = []  # For collecting all solutions
        self.steps = []  # For visualization
    
    def add_column(self, name: str) -> Column:
        """Add a new column header to the right of the last column."""
        column = Column(name)
        
        # Append to the circular row of headers
        self.root.left.append_to_row(column)
        
        return column
    
    def add_row(self, columns: List[Column]) -> None:
        """Add a row with 1s in the specified columns."""
        if not columns:
            return
        
        # Create the first node of the row
        first_node = Node(columns[0])
        columns[0].size += 1
        columns[0].append_to_column(first_node)
        
        # Add the rest of the row nodes
        prev_node = first_node
        for column in columns[1:]:
            node = Node(column)
            column.size += 1
            column.append_to_column(node)
            prev_node.append_to_row(node)
            prev_node = node
    
    def cover(self, column: Column) -> None:
        """
        Cover a column by removing it from the header row and 
        removing all rows that have a 1 in this column.
        """
        # Record this step for visualization if desired
        self.steps.append(("cover", column.name))
        
        # Remove column header from the header row
        column.right.left = column.left
        column.left.right = column.right
        
        # Remove all rows that have a 1 in this column
        row = column.down
        while row != column:
            node = row.right
            while node != row:
                node.down.up = node.up
                node.up.down = node.down
                node.column.size -= 1
                node = node.right
            row = row.down
    
    def uncover(self, column: Column) -> None:
        """
        Uncover a column - the exact inverse of the cover operation,
        restoring all removed rows and the column header.
        """
        # Restore all rows that had a 1 in this column (in reverse order)
        row = column.up
        while row != column:
            node = row.left
            while node != row:
                node.column.size += 1
                node.down.up = node
                node.up.down = node
                node = node.left
            row = row.up
        
        # Restore column header to the header row
        column.right.left = column
        column.left.right = column
        
        # Record this step for visualization
        self.steps.append(("uncover", column.name))
    
    def select_min_column(self) -> Column:
        """Find the column with the smallest size (most constrained)."""
        min_size = float('inf')
        min_column = None
        
        # Iterate through column headers to find minimum
        col = self.root.right
        while col != self.root:
            if col.size < min_size:
                min_size = col.size
                min_column = col
            col = col.right
        
        return min_column
    
    def search(self, k: int, record_steps: bool = False) -> bool:
        """
        Recursively search for a solution to the exact cover problem.
        
        Args:
            k: Current depth in the search tree
            record_steps: Whether to record steps for visualization
        
        Returns:
            True if a solution is found, False otherwise
        """
        # If no columns left, we found a solution
        if self.root.right == self.root:
            # Copy the current solution
            solution_copy = self.solution.copy()
            self.all_solutions.append(solution_copy)
            return True
        
        # Choose the most constrained column (smallest size)
        column = self.select_min_column()
        
        if record_steps:
            self.steps.append(("select_column", column.name))
        
        # Cover this column
        self.cover(column)
        
        # Try each row in this column
        row = column.down
        found_solution = False
        
        while row != column and not found_solution:
            # Add this row to our partial solution
            self.solution.append(row)
            
            if record_steps:
                row_data = []
                node = row
                while True:
                    row_data.append(node.column.name)
                    node = node.right
                    if node == row:
                        break
                self.steps.append(("select_row", row_data))
            
            # Cover all columns in this row
            node = row.right
            while node != row:
                self.cover(node.column)
                node = node.right
            
            # Recurse
            found_solution = self.search(k + 1, record_steps)
            
            # If we didn't find a solution, backtrack
            if not found_solution:
                # Remove this row from the partial solution
                self.solution.pop()
                
                if record_steps:
                    self.steps.append(("deselect_row", row.column.name))
                
                # Uncover all columns in this row (in reverse order)
                node = row.left
                while node != row:
                    self.uncover(node.column)
                    node = node.left
            
            row = row.down
        
        # Uncover this column
        self.uncover(column)
        
        return found_solution
    
    def solve(self, record_steps: bool = False) -> List[List[Node]]:
        """
        Solve the exact cover problem and return all solutions.
        
        Args:
            record_steps: Whether to record steps for visualization
        
        Returns:
            List of solutions, each solution being a list of rows
        """
        self.all_solutions = []
        self.solution = []
        self.steps = []
        
        self.search(0, record_steps)
        
        return self.all_solutions