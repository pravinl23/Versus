// Common game board component that can be customized for different games
import React from 'react';

const GameBoard = ({ 
  rows, 
  cols, 
  renderCell, 
  onCellClick,
  className = '' 
}) => {
  return (
    <div className={`game-board ${className}`}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="board-row">
          {Array.from({ length: cols }, (_, col) => (
            <div
              key={`${row}-${col}`}
              className="board-cell"
              onClick={() => onCellClick && onCellClick(row, col)}
            >
              {renderCell(row, col)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GameBoard; 