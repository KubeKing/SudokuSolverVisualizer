/**
 * Implementation of Knuth's Algorithm X with Dancing Links for solving exact cover problems.
 * Based on Donald Knuth's paper "Dancing Links" and the Python implementation.
 */

class Node {
  /**
   * A node in the Dancing Links structure representing a '1' in the exact cover matrix.
   */
  constructor(column = null) {
    // Circular links pointing to self initially
    this.left = this;
    this.right = this;
    this.up = this;
    this.down = this;
    this.column = column; // Points to column header
  }

  /**
   * Append node to the right of this node in the same row.
   */
  appendToRow(node) {
    node.right = this.right;
    node.left = this;
    this.right.left = node;
    this.right = node;
  }

  /**
   * Append node below this node in the same column.
   */
  appendToColumn(node) {
    node.down = this.down;
    node.up = this;
    this.down.up = node;
    this.down = node;
  }
}

class Column extends Node {
  /**
   * A column header node for the Dancing Links structure.
   */
  constructor(name = "") {
    super();
    this.column = this; // Column header is its own column
    this.size = 0; // Number of nodes in this column
    this.name = name; // Identifier (for decoding solutions)
  }
}

class DancingLinks {
  /**
   * Implementation of Knuth's Dancing Links algorithm for exact cover problems.
   */
  constructor() {
    this.root = new Column("root"); // Create root header
    this.solution = []; // Rows in the current solution
    this.allSolutions = []; // For collecting all solutions
    this.steps = []; // For visualization
  }

  /**
   * Add a new column header to the right of the last column.
   */
  addColumn(name) {
    const column = new Column(name);
    
    // Append to the circular row of headers
    this.root.left.appendToRow(column);
    
    return column;
  }

  /**
   * Add a row with 1s in the specified columns.
   */
  addRow(columns) {
    if (!columns || columns.length === 0) {
      return;
    }
    
    // Create the first node of the row
    const firstNode = new Node(columns[0]);
    columns[0].size += 1;
    columns[0].appendToColumn(firstNode);
    
    // Add the rest of the row nodes
    let prevNode = firstNode;
    for (let i = 1; i < columns.length; i++) {
      const column = columns[i];
      const node = new Node(column);
      column.size += 1;
      column.appendToColumn(node);
      prevNode.appendToRow(node);
      prevNode = node;
    }
  }

  /**
   * Cover a column by removing it from the header row and 
   * removing all rows that have a 1 in this column.
   */
  cover(column) {
    // Record this step for visualization if desired
    this.steps.push(["cover", column.name]);
    
    // Remove column header from the header row
    column.right.left = column.left;
    column.left.right = column.right;
    
    // Remove all rows that have a 1 in this column
    let row = column.down;
    while (row !== column) {
      let node = row.right;
      while (node !== row) {
        node.down.up = node.up;
        node.up.down = node.down;
        node.column.size -= 1;
        node = node.right;
      }
      row = row.down;
    }
  }

  /**
   * Uncover a column - the exact inverse of the cover operation,
   * restoring all removed rows and the column header.
   */
  uncover(column) {
    // Restore all rows that had a 1 in this column (in reverse order)
    let row = column.up;
    while (row !== column) {
      let node = row.left;
      while (node !== row) {
        node.column.size += 1;
        node.down.up = node;
        node.up.down = node;
        node = node.left;
      }
      row = row.up;
    }
    
    // Restore column header to the header row
    column.right.left = column;
    column.left.right = column;
    
    // Record this step for visualization
    this.steps.push(["uncover", column.name]);
  }

  /**
   * Find the column with the smallest size (most constrained).
   */
  selectMinColumn() {
    let minSize = Infinity;
    let minColumn = null;
    
    // Iterate through column headers to find minimum
    let col = this.root.right;
    while (col !== this.root) {
      if (col.size < minSize) {
        minSize = col.size;
        minColumn = col;
      }
      col = col.right;
    }
    
    return minColumn;
  }

  /**
   * Recursively search for a solution to the exact cover problem.
   */
  search(k, recordSteps = false) {
    // If no columns left, we found a solution
    if (this.root.right === this.root) {
      // Copy the current solution
      const solutionCopy = [...this.solution];
      this.allSolutions.push(solutionCopy);
      return true;
    }
    
    // Choose the most constrained column (smallest size)
    const column = this.selectMinColumn();
    
    if (recordSteps) {
      this.steps.push(["select_column", column.name]);
    }
    
    // Cover this column
    this.cover(column);
    
    // Try each row in this column
    let row = column.down;
    let foundSolution = false;
    
    while (row !== column && !foundSolution) {
      // Add this row to our partial solution
      this.solution.push(row);
      
      if (recordSteps) {
        const rowData = [];
        let node = row;
        do {
          rowData.push(node.column.name);
          node = node.right;
        } while (node !== row);
        this.steps.push(["select_row", rowData]);
      }
      
      // Cover all columns in this row
      let node = row.right;
      while (node !== row) {
        this.cover(node.column);
        node = node.right;
      }
      
      // Recurse
      foundSolution = this.search(k + 1, recordSteps);
      
      // If we didn't find a solution, backtrack
      if (!foundSolution) {
        // Remove this row from the partial solution
        this.solution.pop();
        
        if (recordSteps) {
          this.steps.push(["deselect_row", row.column.name]);
        }
        
        // Uncover all columns in this row (in reverse order)
        node = row.left;
        while (node !== row) {
          this.uncover(node.column);
          node = node.left;
        }
      }
      
      row = row.down;
    }
    
    // Uncover this column
    this.uncover(column);
    
    return foundSolution;
  }

  /**
   * Solve the exact cover problem and return all solutions.
   */
  solve(recordSteps = false) {
    this.allSolutions = [];
    this.solution = [];
    this.steps = [];
    
    this.search(0, recordSteps);
    
    return this.allSolutions;
  }
}

export default DancingLinks;
