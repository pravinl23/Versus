import React, { useState, useEffect } from 'react';
import GameBoard from '../../common/GameBoard';
import GameTimer from '../../common/GameTimer';
import useGameWebSocket from '../../../hooks/useGameWebSocket';
import { GAME_STATUS, GAME_MESSAGES } from '../../../utils/gameUtils';
import './Battleship.css';

const BOARD_SIZE = 10;
const SHIPS = [
  { name: 'Carrier', size: 5, id: 'carrier' },
  { name: 'Battleship', size: 4, id: 'battleship' },
  { name: 'Cruiser', size: 3, id: 'cruiser' },
  { name: 'Submarine', size: 3, id: 'submarine' },
  { name: 'Destroyer', size: 2, id: 'destroyer' }
];

const Battleship = ({ player1Model, player2Model, gameId }) => {
  // Game state
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.WAITING);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [player1Board, setPlayer1Board] = useState(createEmptyBoard());
  const [player2Board, setPlayer2Board] = useState(createEmptyBoard());
  const [player1Shots, setPlayer1Shots] = useState(createEmptyBoard());
  const [player2Shots, setPlayer2Shots] = useState(createEmptyBoard());
  const [message, setMessage] = useState(GAME_MESSAGES.WAITING_FOR_MOVE);
  const [winner, setWinner] = useState(null);

  // WebSocket connection
  const { gameState, isConnected, sendMessage } = useGameWebSocket('battleship', gameId);

  // Handle game state updates from WebSocket
  useEffect(() => {
    if (gameState) {
      setCurrentPlayer(gameState.currentPlayer);
      setPlayer1Board(gameState.player1Board || player1Board);
      setPlayer2Board(gameState.player2Board || player2Board);
      setPlayer1Shots(gameState.player1Shots || player1Shots);
      setPlayer2Shots(gameState.player2Shots || player2Shots);
      setGameStatus(gameState.status);
      setWinner(gameState.winner);
    }
  }, [gameState]);

  // Initialize empty board
  function createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }

  // Render cell for player's own board (shows ships and hits)
  const renderOwnBoard = (player) => (row, col) => {
    const board = player === 1 ? player1Board : player2Board;
    const shots = player === 1 ? player2Shots : player1Shots; // Opponent's shots at this player
    const cellValue = board[row][col];
    const isHit = shots[row][col] === 'hit';
    const isMiss = shots[row][col] === 'miss';

    if (isHit) {
      return <div className="cell-hit">💥</div>;
    } else if (isMiss) {
      return <div className="cell-miss">💨</div>;
    } else if (cellValue) {
      return <div className="cell-ship">🚢</div>;
    }
    return null;
  };

  // Render cell for opponent's board (shows only hits/misses)
  const renderOpponentBoard = (player) => (row, col) => {
    const shots = player === 1 ? player1Shots : player2Shots;
    const shotResult = shots[row][col];

    if (shotResult === 'hit') {
      return <div className="cell-hit">💥</div>;
    } else if (shotResult === 'miss') {
      return <div className="cell-miss">💨</div>;
    }
    return null;
  };

  // Handle shot on opponent's board
  const handleShot = (row, col) => {
    if (gameStatus !== GAME_STATUS.IN_PROGRESS) return;
    
    // For now, just send the move to backend
    sendMessage({
      type: 'move',
      player: currentPlayer,
      position: { row, col }
    });
  };

  // Get column letters
  const getColumnLabel = (index) => String.fromCharCode(65 + index); // A, B, C...

  return (
    <div className="battleship-game">
      <div className="game-header">
        <h2>Battleship</h2>
        <GameTimer isActive={gameStatus === GAME_STATUS.IN_PROGRESS} />
      </div>

      <div className="players-info">
        <div className={`player-info ${currentPlayer === 1 ? 'current-player' : ''}`}>
          <span className="player-name">Player 1: {player1Model}</span>
        </div>
        <div className={`player-info ${currentPlayer === 2 ? 'current-player' : ''}`}>
          <span className="player-name">Player 2: {player2Model}</span>
        </div>
      </div>

      <div className="game-message">
        {winner ? `${winner === 1 ? player1Model : player2Model} wins!` : message}
      </div>

      <div className="boards-container">
        {/* Player 1's view */}
        <div className="player-view">
          <h3>{player1Model}'s Fleet</h3>
          <div className="board-with-labels">
            <div className="column-labels">
              <div className="empty-cell"></div>
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <div key={i} className="label">{getColumnLabel(i)}</div>
              ))}
            </div>
            <div className="board-row-container">
              <div className="row-labels">
                {Array.from({ length: BOARD_SIZE }, (_, i) => (
                  <div key={i} className="label">{i + 1}</div>
                ))}
              </div>
              <GameBoard
                rows={BOARD_SIZE}
                cols={BOARD_SIZE}
                renderCell={renderOwnBoard(1)}
                className="own-board"
              />
            </div>
          </div>
        </div>

        {/* Targeting board */}
        <div className="player-view">
          <h3>Target Grid</h3>
          <div className="board-with-labels">
            <div className="column-labels">
              <div className="empty-cell"></div>
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <div key={i} className="label">{getColumnLabel(i)}</div>
              ))}
            </div>
            <div className="board-row-container">
              <div className="row-labels">
                {Array.from({ length: BOARD_SIZE }, (_, i) => (
                  <div key={i} className="label">{i + 1}</div>
                ))}
              </div>
              <GameBoard
                rows={BOARD_SIZE}
                cols={BOARD_SIZE}
                renderCell={renderOpponentBoard(currentPlayer)}
                onCellClick={handleShot}
                className="target-board"
              />
            </div>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="connection-status">
          Connecting to game server...
        </div>
      )}
    </div>
  );
};

export default Battleship; 