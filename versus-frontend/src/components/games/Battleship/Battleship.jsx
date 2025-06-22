import React, { useState, useEffect, useRef } from 'react';
import SidebarVote from '../../SidebarVote';
import GameBoard from '../../common/GameBoard';
import GameTimer from '../../common/GameTimer';
import './Battleship.css';

const BOARD_SIZE = 8;

const GAME_STATUS = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress', 
  FINISHED: 'finished',
  ERROR: 'error'
};

const Battleship = ({ player1Model, player2Model, onBack }) => {
  const [gameId, setGameId] = useState('');
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.WAITING);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [player1Board, setPlayer1Board] = useState(createEmptyBoard());
  const [player2Board, setPlayer2Board] = useState(createEmptyBoard());
  const [player1Shots, setPlayer1Shots] = useState(createEmptyBoard());
  const [player2Shots, setPlayer2Shots] = useState(createEmptyBoard());
  const [message, setMessage] = useState('Starting game...');
  const [winner, setWinner] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameTimer, setGameTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const wsRef = useRef(null);

  // Convert model IDs to the backend format
  const getBackendModelName = (modelId) => {
    // Just return the model ID as-is, the backend will handle the parsing
    return modelId || 'gpt-4o-mini'; // fallback
  };

  const backendPlayer1 = getBackendModelName(player1Model);
  const backendPlayer2 = getBackendModelName(player2Model);

  // Get display names for models
  const getDisplayName = (modelId) => {
    if (!modelId) return 'Unknown';
    const modelStr = modelId.toString();
    
    // OpenAI models
    if (modelStr.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (modelStr.includes('gpt-4o')) return 'GPT-4o';
    if (modelStr.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
    if (modelStr.includes('gpt-3.5')) return 'GPT-3.5 Turbo';
    
    // Claude models
    if (modelStr.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
    if (modelStr.includes('claude-3-haiku')) return 'Claude 3 Haiku';
    
    // Gemini models
    if (modelStr.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
    if (modelStr.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
    
    // Groq models
    if (modelStr.includes('mixtral')) return 'Mixtral 8x7B';
    if (modelStr.includes('llama-3.1-70b')) return 'Llama 3.1 70B';
    if (modelStr.includes('llama-3.1-8b')) return 'Llama 3.1 8B';
    
    return modelStr.charAt(0).toUpperCase() + modelStr.slice(1);
  };

  const player1DisplayName = getDisplayName(player1Model);
  const player2DisplayName = getDisplayName(player2Model);

  // Initialize game
  useEffect(() => {
    const newGameId = `battleship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setGameId(newGameId);
    setGameStartTime(Date.now());
    
    // Try to connect to WebSocket, but don't fail if it doesn't work
    connectWebSocket(newGameId);
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        console.log('Closing WebSocket connection on unmount');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array to run only once

  const connectWebSocket = (gameId) => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/games/battleship/${gameId}`);
      
      ws.onopen = () => {
        console.log('Connected to Battleship WebSocket');
        setIsConnected(true);
        setMessage('Connected! Setting up ships...');
        
        // Only start the game if not already started
        if (!gameStarted) {
          console.log('Sending models to backend:', { player1Model: backendPlayer1, player2Model: backendPlayer2 });
          ws.send(JSON.stringify({
            type: 'start_game',
            player1Model: backendPlayer1,
            player2Model: backendPlayer2,
            autoPlaceShips: true
          }));
          setGameStarted(true);
          setGameStatus(GAME_STATUS.IN_PROGRESS);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleGameStateUpdate(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setMessage('Connection error - demo mode');
        setIsConnected(false);
        // Set up demo game
        setupDemoGame();
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        if (!winner) {
          setMessage('Connection lost - demo mode');
          setupDemoGame();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setMessage('Backend unavailable - demo mode');
      setupDemoGame();
    }
  };

  const setupDemoGame = () => {
    // Create demo boards with some ships
    const demoBoard1 = createEmptyBoard();
    const demoBoard2 = createEmptyBoard();
    
    // Add some demo ships
    demoBoard1[0][0] = 'carrier';
    demoBoard1[0][1] = 'carrier';
    demoBoard1[0][2] = 'carrier';
    
    demoBoard2[2][2] = 'battleship';
    demoBoard2[2][3] = 'battleship';
    demoBoard2[2][4] = 'battleship';
    
    setPlayer1Board(demoBoard1);
    setPlayer2Board(demoBoard2);
    setGameStatus(GAME_STATUS.IN_PROGRESS);
    setMessage('Demo mode - AI battle simulation');
    
    // Simulate some shots
    setTimeout(() => {
      const shots1 = createEmptyBoard();
      const shots2 = createEmptyBoard();
      shots1[2][2] = 'hit';
      shots2[0][0] = 'hit';
      setPlayer1Shots(shots1);
      setPlayer2Shots(shots2);
      setMessage(`${player1DisplayName} and ${player2DisplayName} exchanging fire!`);
    }, 2000);
  };

  const handleGameStateUpdate = (data) => {
    console.log('Game state update:', data.type);
    
    if (data.type === 'ship_placed') {
      if (data.player === 1) {
        setPlayer1Board(data.board);
      } else {
        setPlayer2Board(data.board);
      }
      setMessage(`Ships placed for Player ${data.player}`);
    } else if (data.type === 'placement_complete') {
      setPlayer1Board(data.player1Board);
      setPlayer2Board(data.player2Board);
      setMessage(data.message);
      setGameStatus(GAME_STATUS.IN_PROGRESS);
    } else if (data.type === 'game_state') {
      setCurrentPlayer(data.currentPlayer);
      if (data.player1Shots) setPlayer1Shots(data.player1Shots);
      if (data.player2Shots) setPlayer2Shots(data.player2Shots);
      if (data.player1Board) setPlayer1Board(data.player1Board);
      if (data.player2Board) setPlayer2Board(data.player2Board);
      if (data.status) setGameStatus(data.status);
      if (data.winner) setWinner(data.winner);
      if (data.message) setMessage(data.message);
    } else if (data.type === 'game_over') {
      setWinner(data.winner);
      setGameStatus(GAME_STATUS.FINISHED);
      setMessage(data.message);
    }
  };

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
      return <div className="cell-miss">💨</div>;
    } else if (cellValue) {
      const shipColors = {
        'carrier': '#FF6B6B',
        'battleship': '#4ECDC4',
        'destroyer': '#45B7D1',
        'submarine': '#96CEB4',
        'patrol': '#DDA0DD'
      };
      
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

  return (
    <div className="battleship-game split-screen">
      <SidebarVote 
        gameId={gameId} 
        gameName={`Battleship: ${player1DisplayName} vs ${player2DisplayName}`} 
      />
      
      {/* Winner Overlay */}
      {winner && (
        <div className="game-overlay">
          <div className="game-overlay-content">
            <h2 className="game-over-title">GAME OVER!</h2>
            <div className="winner-name">
              {winner === 1 ? player1DisplayName : player2DisplayName} WINS!
            </div>
            
            <div className="final-stats">
              <div className="stat-box">
                <h3>WINNER</h3>
                <div className="value">{winner === 1 ? player1DisplayName : player2DisplayName}</div>
              </div>
            </div>
            
            <button onClick={() => {
              // Clean up WebSocket before going back
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
              onBack();
            }} className="new-game-overlay-button">
              BACK TO MENU
            </button>
          </div>
        </div>
      )}
      
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
            <div className="board-wrapper">
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
            
            <div className="board-wrapper">
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
            <div className="board-wrapper">
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
            
            <div className="board-wrapper">
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
          Demo Mode - Backend connection unavailable
        </div>
      )}
    </div>
  );
};

export default Battleship; 