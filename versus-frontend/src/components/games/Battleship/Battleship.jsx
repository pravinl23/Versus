import React, { useState, useEffect } from 'react';
import GameBoard from '../../common/GameBoard';
import GameTimer from '../../common/GameTimer';
import useGameWebSocket from '../../../hooks/useGameWebSocket';
import { GAME_STATUS, GAME_MESSAGES } from '../../../utils/gameUtils';
import './Battleship.css';

const BOARD_SIZE = 10;

const Battleship = ({ player1Model, player2Model, gameId }) => {
  // Game state
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.WAITING);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [player1Board, setPlayer1Board] = useState(createEmptyBoard());
  const [player2Board, setPlayer2Board] = useState(createEmptyBoard());
  const [player1Shots, setPlayer1Shots] = useState(createEmptyBoard());
  const [player2Shots, setPlayer2Shots] = useState(createEmptyBoard());
  const [message, setMessage] = useState('Starting game...');
  const [winner, setWinner] = useState(null);

  // WebSocket connection
  const { gameState, isConnected, sendMessage } = useGameWebSocket('battleship', gameId);

  // Start game automatically when connected
  useEffect(() => {
    if (isConnected && gameStatus === GAME_STATUS.WAITING) {
      // Both AIs place ships automatically
      sendMessage({
        type: 'start_game',
        player1Model,
        player2Model,
        autoPlaceShips: true
      });
      setGameStatus(GAME_STATUS.IN_PROGRESS);
    }
  }, [isConnected, gameStatus, player1Model, player2Model, sendMessage]);

  // Handle game state updates from WebSocket
  useEffect(() => {
    if (gameState) {
      setCurrentPlayer(gameState.currentPlayer);
      if (gameState.player1Shots) setPlayer1Shots(gameState.player1Shots);
      if (gameState.player2Shots) setPlayer2Shots(gameState.player2Shots);
      setGameStatus(gameState.status);
      setWinner(gameState.winner);
      setMessage(gameState.message || message);
    }
  }, [gameState]);

  // Initialize empty board
  function createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }

  // Get column letters
  const getColumnLabel = (index) => String.fromCharCode(65 + index);

  // Render cell for player's own board (shows ships and hits)
  const renderOwnBoard = (player) => (row, col) => {
    const board = player === 1 ? player1Board : player2Board;
    const shots = player === 1 ? player2Shots : player1Shots;
    const cellValue = board[row][col];
    const isHit = shots[row][col] === 'hit';
    const isMiss = shots[row][col] === 'miss';

    if (isHit) {
      return <div className="cell-hit">💥</div>;
    } else if (isMiss) {
      return <div className="cell-miss">💨</div>;
    } else if (cellValue) {
      // In AI vs AI, we don't show ships
      return null;
    }
    return null;
  };

  // Render cell for target board (shows shots taken)
  const renderTargetBoard = (player) => (row, col) => {
    const shots = player === 1 ? player1Shots : player2Shots;
    const shotResult = shots[row][col];

    if (shotResult === 'hit') {
      return <div className="cell-hit">💥</div>;
    } else if (shotResult === 'miss') {
      return <div className="cell-miss">💨</div>;
    }
    return null;
  };

  // Main game view - Split Screen
  return (
    <div className="battleship-game split-screen">
      <div className="game-header">
        <GameTimer isActive={gameStatus === GAME_STATUS.IN_PROGRESS && !winner} />
        <div className="game-status-message">{message}</div>
      </div>

      <div className="split-container">
        {/* Player 1 Side */}
        <div className={`player-side player-1-side ${currentPlayer === 1 ? 'active' : ''}`}>
          <div className="player-header">
            <h3>{player1Model}</h3>
            <span className="player-label">Player 1</span>
          </div>
          
          <div className="boards-section">
            <div className="board-container">
              <h4>Defense Grid</h4>
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
                    className="own-board small"
                  />
                </div>
              </div>
            </div>
            
            <div className="board-container">
              <h4>Attack Grid</h4>
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
                    renderCell={renderTargetBoard(1)}
                    className="target-board small"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center divider */}
        <div className="center-divider">
          <div className="vs-indicator">VS</div>
          {winner && (
            <div className="winner-announcement">
              {winner === 1 ? player1Model : player2Model} Wins!
            </div>
          )}
        </div>

        {/* Player 2 Side */}
        <div className={`player-side player-2-side ${currentPlayer === 2 ? 'active' : ''}`}>
          <div className="player-header">
            <h3>{player2Model}</h3>
            <span className="player-label">Player 2</span>
          </div>
          
          <div className="boards-section">
            <div className="board-container">
              <h4>Attack Grid</h4>
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
                    renderCell={renderTargetBoard(2)}
                    className="target-board small"
                  />
                </div>
              </div>
            </div>
            
            <div className="board-container">
              <h4>Defense Grid</h4>
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
                    renderCell={renderOwnBoard(2)}
                    className="own-board small"
                  />
                </div>
              </div>
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