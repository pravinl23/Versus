import React, { useState } from 'react';
import GameBoard from '../../common/GameBoard';

const BOARD_SIZE = 10;
const SHIPS = [
  { name: 'Carrier', size: 5, id: 'carrier' },
  { name: 'Battleship', size: 4, id: 'battleship' },
  { name: 'Cruiser', size: 3, id: 'cruiser' },
  { name: 'Submarine', size: 3, id: 'submarine' },
  { name: 'Destroyer', size: 2, id: 'destroyer' }
];

const ShipPlacement = ({ onComplete }) => {
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [placedShips, setPlacedShips] = useState([]);
  const [currentShip, setCurrentShip] = useState(0);
  const [orientation, setOrientation] = useState('horizontal');
  const [hoveredCells, setHoveredCells] = useState([]);

  const canPlaceShip = (row, col, ship, orientation) => {
    const size = ship.size;
    
    if (orientation === 'horizontal') {
      if (col + size > BOARD_SIZE) return false;
      for (let i = 0; i < size; i++) {
        if (board[row][col + i] !== null) return false;
      }
    } else {
      if (row + size > BOARD_SIZE) return false;
      for (let i = 0; i < size; i++) {
        if (board[row + i][col] !== null) return false;
      }
    }
    
    return true;
  };

  const placeShip = (row, col) => {
    const ship = SHIPS[currentShip];
    if (!canPlaceShip(row, col, ship, orientation)) return;

    const newBoard = board.map(r => [...r]);
    const newShip = { ...ship, row, col, orientation };
    
    if (orientation === 'horizontal') {
      for (let i = 0; i < ship.size; i++) {
        newBoard[row][col + i] = ship.id;
      }
    } else {
      for (let i = 0; i < ship.size; i++) {
        newBoard[row + i][col] = ship.id;
      }
    }
    
    setBoard(newBoard);
    setPlacedShips([...placedShips, newShip]);
    
    if (currentShip < SHIPS.length - 1) {
      setCurrentShip(currentShip + 1);
    } else {
      // All ships placed
      onComplete(newBoard, [...placedShips, newShip]);
    }
  };

  const handleCellHover = (row, col) => {
    const ship = SHIPS[currentShip];
    const cells = [];
    
    if (canPlaceShip(row, col, ship, orientation)) {
      if (orientation === 'horizontal') {
        for (let i = 0; i < ship.size; i++) {
          cells.push(`${row}-${col + i}`);
        }
      } else {
        for (let i = 0; i < ship.size; i++) {
          cells.push(`${row + i}-${col}`);
        }
      }
    }
    
    setHoveredCells(cells);
  };

  const renderCell = (row, col) => {
    const cellKey = `${row}-${col}`;
    const isHovered = hoveredCells.includes(cellKey);
    const cellValue = board[row][col];
    
    if (cellValue) {
      return <div className="placed-ship">🚢</div>;
    }
    
    if (isHovered) {
      return <div className="ship-preview">⚓</div>;
    }
    
    return null;
  };

  return (
    <div className="ship-placement">
      <h3>Place Your Ships</h3>
      <div className="placement-info">
        <p>Placing: <strong>{SHIPS[currentShip]?.name}</strong> (Size: {SHIPS[currentShip]?.size})</p>
        <button 
          className="orientation-button"
          onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
        >
          Orientation: {orientation}
        </button>
      </div>
      
      <div className="placement-board">
        <GameBoard
          rows={BOARD_SIZE}
          cols={BOARD_SIZE}
          renderCell={renderCell}
          onCellClick={placeShip}
          onCellHover={handleCellHover}
          onCellLeave={() => setHoveredCells([])}
          className="placement-grid"
        />
      </div>
      
      <div className="ships-status">
        {SHIPS.map((ship, index) => (
          <div 
            key={ship.id} 
            className={`ship-status ${index < placedShips.length ? 'placed' : ''} ${index === currentShip ? 'current' : ''}`}
          >
            {ship.name} ({ship.size})
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShipPlacement; 