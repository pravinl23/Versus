import React, { useState, useEffect } from 'react';
import GameBoard from '../../common/GameBoard';
import GameTimer from '../../common/GameTimer';
import useGameWebSocket from '../../../hooks/useGameWebSocket';
import { GAME_STATUS, GAME_MESSAGES } from '../../../utils/gameUtils';
import './Battleship.css';

const BOARD_SIZE = 8;

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

  // Convert model IDs to the backend format
  const getBackendModelName = (modelId) => {
    if (!modelId) return 'openai'; // fallback
    const modelStr = modelId.toString().toLowerCase();
    if (modelStr.includes('gpt') || modelStr.includes('openai')) return 'openai';
    if (modelStr.includes('claude') || modelStr.includes('anthropic')) return 'anthropic';
    if (modelStr.includes('gemini') || modelStr.includes('google')) return 'gemini';
    if (modelStr.includes('groq') || modelStr.includes('mixtral') || modelStr.includes('llama')) return 'groq';
    return 'openai'; // fallback
  };

  const backendPlayer1 = getBackendModelName(player1Model);
  const backendPlayer2 = getBackendModelName(player2Model);

  // Get display names for models
  const getDisplayName = (modelId) => {
    if (!modelId) return 'Unknown';
    const modelStr = modelId.toString();
    if (modelStr.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (modelStr.includes('gpt-4o')) return 'GPT-4o';
    if (modelStr.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
    if (modelStr.includes('gpt-3.5')) return 'GPT-3.5';
    if (modelStr.includes('claude-3-opus')) return 'Claude 3 Opus';
    if (modelStr.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
    if (modelStr.includes('claude-3-haiku')) return 'Claude 3 Haiku';
    if (modelStr.includes('gemini-pro')) return 'Gemini Pro';
    if (modelStr.includes('gemini')) return 'Gemini';
    if (modelStr.includes('mixtral')) return 'Mixtral';
    if (modelStr.includes('llama')) return 'Llama';
    return modelStr.charAt(0).toUpperCase() + modelStr.slice(1);
  };

  const player1DisplayName = getDisplayName(player1Model);
  const player2DisplayName = getDisplayName(player2Model);

  // Start game automatically when connected
  useEffect(() => {
    if (isConnected && gameStatus === GAME_STATUS.WAITING) {
      // Both AIs place ships automatically
      sendMessage({
        type: 'start_game',
        player1Model: backendPlayer1,
        player2Model: backendPlayer2,
        autoPlaceShips: true
      });
      setGameStatus(GAME_STATUS.IN_PROGRESS);
    }
  }, [isConnected, gameStatus, backendPlayer1, backendPlayer2, sendMessage]);

  // Handle game state updates from WebSocket
  useEffect(() => {
    if (gameState) {
      // Handle different message types
      if (gameState.type === 'ship_placed') {
        // Update board with ship placement
        if (gameState.player === 1) {
          setPlayer1Board(gameState.board);
        } else {
          setPlayer2Board(gameState.board);
        }
        setMessage(`${gameState.ship} placed for Player ${gameState.player}`);
      } else if (gameState.type === 'placement_complete') {
        // Ships are all placed, update both boards
        setPlayer1Board(gameState.player1Board);
        setPlayer2Board(gameState.player2Board);
        setMessage(gameState.message);
        setGameStatus(GAME_STATUS.IN_PROGRESS);
      } else if (gameState.type === 'placement_start') {
        setMessage(gameState.message);
      } else if (gameState.type === 'game_state') {
        // Regular game state update
        setCurrentPlayer(gameState.currentPlayer);
        if (gameState.player1Shots) setPlayer1Shots(gameState.player1Shots);
        if (gameState.player2Shots) setPlayer2Shots(gameState.player2Shots);
        if (gameState.status) setGameStatus(gameState.status);
        if (gameState.winner) setWinner(gameState.winner);
        if (gameState.message) setMessage(gameState.message);
      }
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

    if (isMiss && !cellValue) {
      // Miss in empty water
      return <div className="cell-miss">💨</div>;
    } else if (cellValue) {
      // Show ship with different colors based on ship type
      const shipColors = {
        'carrier': '#FF6B6B',     // Red
        'battleship': '#4ECDC4',  // Teal
        'destroyer': '#45B7D1',   // Blue
        'submarine': '#96CEB4',   // Green
        'patrol': '#DDA0DD'       // Plum
      };
      
      // If hit, show both ship and hit marker
      if (isHit) {
        return (
          <div 
            className="cell-ship cell-ship-hit" 
            style={{ backgroundColor: shipColors[cellValue] || '#666' }}
            title={`${cellValue} - HIT!`}
          >
            <span className="ship-icon">🚢</span>
            <span className="hit-overlay">💥</span>
          </div>
        );
      } else {
        // Just show the ship
        return (
          <div 
            className="cell-ship" 
            style={{ backgroundColor: shipColors[cellValue] || '#666' }}
            title={cellValue}
          >
            🚢
          </div>
        );
      }
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
            <h3>{player1DisplayName}</h3>
            <span className="player-label">Player 1</span>
          </div>
          
          <div className="boards-section">
            <div className="board-container">
              <h4>Defense Grid</h4>
              <div className="board-with-labels">
                <table className="battleship-table">
                  <thead>
                    <tr>
                      <th className="corner-cell"></th>
                      {Array.from({ length: BOARD_SIZE }, (_, i) => (
                        <th key={i} className="col-label">{getColumnLabel(i)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: BOARD_SIZE }, (_, row) => (
                      <tr key={row}>
                        <td className="row-label">{row + 1}</td>
                        {Array.from({ length: BOARD_SIZE }, (_, col) => (
                          <td key={`${row}-${col}`} className="game-cell own-cell">
                            {renderOwnBoard(1)(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="board-container">
              <h4>Attack Grid</h4>
              <div className="board-with-labels">
                <table className="battleship-table">
                  <thead>
                    <tr>
                      <th className="corner-cell"></th>
                      {Array.from({ length: BOARD_SIZE }, (_, i) => (
                        <th key={i} className="col-label">{getColumnLabel(i)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: BOARD_SIZE }, (_, row) => (
                      <tr key={row}>
                        <td className="row-label">{row + 1}</td>
                        {Array.from({ length: BOARD_SIZE }, (_, col) => (
                          <td key={`${row}-${col}`} className="game-cell target-cell">
                            {renderTargetBoard(1)(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Center divider */}
        <div className="center-divider">
          <div className="vs-indicator">VS</div>
          {winner && (
            <div className="winner-announcement">
              {winner === 1 ? player1DisplayName : player2DisplayName} Wins!
            </div>
          )}
        </div>

        {/* Player 2 Side */}
        <div className={`player-side player-2-side ${currentPlayer === 2 ? 'active' : ''}`}>
          <div className="player-header">
            <h3>{player2DisplayName}</h3>
            <span className="player-label">Player 2</span>
          </div>
          
          <div className="boards-section">
            <div className="board-container">
              <h4>Attack Grid</h4>
              <div className="board-with-labels">
                <table className="battleship-table">
                  <thead>
                    <tr>
                      <th className="corner-cell"></th>
                      {Array.from({ length: BOARD_SIZE }, (_, i) => (
                        <th key={i} className="col-label">{getColumnLabel(i)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: BOARD_SIZE }, (_, row) => (
                      <tr key={row}>
                        <td className="row-label">{row + 1}</td>
                        {Array.from({ length: BOARD_SIZE }, (_, col) => (
                          <td key={`${row}-${col}`} className="game-cell target-cell">
                            {renderTargetBoard(2)(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="board-container">
              <h4>Defense Grid</h4>
              <div className="board-with-labels">
                <table className="battleship-table">
                  <thead>
                    <tr>
                      <th className="corner-cell"></th>
                      {Array.from({ length: BOARD_SIZE }, (_, i) => (
                        <th key={i} className="col-label">{getColumnLabel(i)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: BOARD_SIZE }, (_, row) => (
                      <tr key={row}>
                        <td className="row-label">{row + 1}</td>
                        {Array.from({ length: BOARD_SIZE }, (_, col) => (
                          <td key={`${row}-${col}`} className="game-cell own-cell">
                            {renderOwnBoard(2)(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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