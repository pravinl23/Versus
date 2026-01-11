import React, { useState, useEffect } from 'react';
import SidebarVote from '../SidebarVote';
import './ConnectionsGame.css';

const ConnectionsGame = ({ player1Model, player2Model, onBack }) => {
  const [gameId, setGameId] = useState('');
  const [player1State, setPlayer1State] = useState(null);
  const [player2State, setPlayer2State] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [player1Processing, setPlayer1Processing] = useState(false);
  const [player2Processing, setPlayer2Processing] = useState(false);
  const [ws, setWs] = useState(null);

  // Get display names for models
  const getDisplayName = (modelId) => {
    if (!modelId) return 'Unknown'
    if (modelId.includes('gpt-4o')) return 'GPT-4o'
    if (modelId.includes('gpt-4-turbo')) return 'GPT-4 Turbo'
    if (modelId.includes('gpt-3.5')) return 'GPT-3.5'
    if (modelId.includes('claude-3-opus')) return 'Claude 3 Opus'
    if (modelId.includes('claude-3-sonnet')) return 'Claude 3 Sonnet'
    if (modelId.includes('claude-3-haiku')) return 'Claude 3 Haiku'
    if (modelId.includes('gemini')) return 'Gemini'
    return modelId.charAt(0).toUpperCase() + modelId.slice(1)
  }

  // Start a new game when component mounts
  useEffect(() => {
    // Try to start the game but handle failures gracefully
    startNewGame();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const startNewGame = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/connections/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player1_model: player1Model,
          player2_model: player2Model,
        }),
      });

      if (!response.ok) {
        throw new Error('Backend not available');
      }

      const data = await response.json();
      
      // Use the game ID from the backend
      setGameId(data.game_id);
      
      // Initialize both player states
      const initialState = {
        puzzle_id: data.puzzle_id || 'demo',
        date: data.date || new Date().toISOString().split('T')[0],
        all_words: data.words || ['DEMO', 'WORDS', 'FOR', 'TESTING'],
        remaining_words: data.words || ['DEMO', 'WORDS', 'FOR', 'TESTING'],
        found_groups: [],
        incorrect_guesses: [],
        game_over: false,
        winner: null,
      };
      
      setPlayer1State(initialState);
      setPlayer2State({...initialState});
      setLoading(false);
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Backend not available - showing demo mode');
      
      // Generate a fallback game ID for demo mode
      const fallbackGameId = `connections-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setGameId(fallbackGameId);
      
      // Show demo state instead of failing
      const demoState = {
        puzzle_id: 'demo',
        date: new Date().toISOString().split('T')[0],
        all_words: ['DEMO', 'MODE', 'GAME', 'SOON'],
        remaining_words: ['DEMO', 'MODE', 'GAME', 'SOON'],
        found_groups: [],
        incorrect_guesses: [],
        game_over: false,
        winner: null,
      };
      
      setPlayer1State(demoState);
      setPlayer2State({...demoState});
      setLoading(false);
    }
  };

  // Set up WebSocket connection
  useEffect(() => {
    if (gameId) {
      const websocket = new WebSocket(`ws://localhost:8000/api/connections/ws/${gameId}`);
      
      websocket.onopen = () => {
        console.log('Connected to Connections WebSocket');
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'game_update') {
          const { player, game_state } = data.data;
          if (player === 1) {
            setPlayer1State(game_state);
            setPlayer1Processing(false);
          } else {
            setPlayer2State(game_state);
            setPlayer2Processing(false);
          }
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);
    }
  }, [gameId]);

  const processAITurn = async (player) => {
    if (!gameId) return;
    
    const gameState = player === 1 ? player1State : player2State;
    if (gameState?.game_over) return;

    if (player === 1) {
      setPlayer1Processing(true);
    } else {
      setPlayer2Processing(true);
    }

    try {
      const response = await fetch(`http://localhost:8000/api/connections/game/${gameId}/player/${player}/ai-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      console.log(`Player ${player} AI turn result:`, data);
    } catch (error) {
      console.error(`Error processing AI turn for player ${player}:`, error);
      if (player === 1) {
        setPlayer1Processing(false);
      } else {
        setPlayer2Processing(false);
      }
    }
  };

  // Check for game over
  const checkGameOver = () => {
    if (player1State && player1State.found_groups.length === 4) {
      return { gameOver: true, winner: 'Player 1' };
    }
    if (player2State && player2State.found_groups.length === 4) {
      return { gameOver: true, winner: 'Player 2' };
    }
    return { gameOver: false, winner: null };
  };

  const gameStatus = checkGameOver();

  // Auto-play for player 1
  useEffect(() => {
    if (player1State && !player1State.game_over && !player1Processing && !gameStatus.gameOver) {
      const timer = setTimeout(() => {
        processAITurn(1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [player1State, player1Processing, gameStatus.gameOver]);

  // Auto-play for player 2
  useEffect(() => {
    if (player2State && !player2State.game_over && !player2Processing && !gameStatus.gameOver) {
      const timer = setTimeout(() => {
        processAITurn(2);
      }, 1500); // Slight offset to avoid simultaneous requests
      return () => clearTimeout(timer);
    }
  }, [player2State, player2Processing, gameStatus.gameOver]);

  if (loading) {
    return (
      <div className="connections-game" style={{ paddingRight: '60px' }}>
        <SidebarVote 
          gameId={gameId} 
          gameName={`Connections: ${getDisplayName(player1Model)} vs ${getDisplayName(player2Model)}`} 
        />
        <div className="connections-container">
          <button onClick={onBack} className="back-button">
            ← Back to Menu
          </button>
          <div className="loading" style={{ textAlign: 'center', padding: '50px', color: 'white' }}>
            Loading NYT Connections...
          </div>
        </div>
      </div>
    );
  }

  if (!player1State || !player2State) {
    return (
      <div className="connections-game" style={{ paddingRight: '60px' }}>
        <SidebarVote 
          gameId={gameId} 
          gameName={`Connections: ${getDisplayName(player1Model)} vs ${getDisplayName(player2Model)}`} 
        />
        <div className="connections-container">
          <button onClick={onBack} className="back-button">
            ← Back to Menu
          </button>
          <div className="error" style={{ textAlign: 'center', padding: '50px', color: 'white' }}>
            Failed to load game. Please try again.
          </div>
        </div>
      </div>
    );
  }

  const getLevelColor = (level) => {
    const colors = ['#f9df6d', '#a0c35a', '#b0c4ef', '#ba81c5'];
    return colors[level] || '#999';
  };

  return (
    <div className="connections-game" style={{ paddingRight: '60px' }}>
      <SidebarVote 
        gameId={gameId} 
        gameName={`Connections: ${getDisplayName(player1Model)} vs ${getDisplayName(player2Model)}`} 
      />
      
      <div className="connections-container">
        <button onClick={onBack} className="back-button">
          ← Back to Menu
        </button>

        {error && (
          <div style={{ 
            background: '#f59e0b', 
            color: 'white', 
            padding: '10px', 
            margin: '10px 0', 
            borderRadius: '5px' 
          }}>
            {error}
          </div>
        )}

        <div className="connections-header">
          <h1>NYT Connections</h1>
          <div className="puzzle-info">
            Puzzle #{player1State.puzzle_id} • {player1State.date}
          </div>
        </div>

        {/* Game Overlay */}
        {gameStatus.gameOver && (
          <div className="game-overlay">
            <div className="game-overlay-content">
              <h2 className="game-over-title">GAME OVER!</h2>
              <div className="winner-name">
                {gameStatus.winner === 'Player 1' ? getDisplayName(player1Model) : getDisplayName(player2Model)} WINS!
              </div>
              
              <div className="final-stats">
                <div className="stat-box">
                  <h3>{getDisplayName(player1Model)}</h3>
                  <div className="value">{player1State.found_groups.length}</div>
                </div>
                <div className="stat-box">
                  <h3>{getDisplayName(player2Model)}</h3>
                  <div className="value">{player2State.found_groups.length}</div>
                </div>
              </div>
              
              <button onClick={startNewGame} className="new-game-overlay-button">
                NEW GAME
              </button>
            </div>
          </div>
        )}

        <div className="connections-split-view">
          {/* Player 1 Side */}
          <div className={`player-side ${player1Processing ? 'active' : ''}`}>
            <div className="player-header">
              <h2>{getDisplayName(player1Model)}</h2>
              {player1Processing && <span className="thinking">🤔 Thinking...</span>}
            </div>
            
            <div className="player-stats">
              <div className="stat">
                <span className="stat-label">Groups Found:</span>
                <span className="stat-value">{player1State.found_groups.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Incorrect Guesses:</span>
                <span className="stat-value">{player1State.incorrect_guesses.length}</span>
              </div>
            </div>

            {/* Player 1 Game Board */}
            <div className="player-game-board">
              {/* Found Groups */}
              {player1State.found_groups.length > 0 && (
                <div className="found-groups-small">
                  {player1State.found_groups.map((group, index) => (
                    <div 
                      key={index} 
                      className="found-group-small"
                      style={{ backgroundColor: getLevelColor(group.level) }}
                    >
                      <div className="group-name-small">{group.group_name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Remaining Words */}
              {player1State.remaining_words.length > 0 && !player1State.game_over && (
                <div className="words-grid-small">
                  {player1State.remaining_words.map((word, index) => (
                    <div key={index} className="word-tile-small">
                      {word}
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Incorrect Guesses */}
              {player1State.incorrect_guesses.length > 0 && (
                <div className="player-guesses">
                  <h4>Recent Guesses:</h4>
                  {player1State.incorrect_guesses.slice(-3).map((guess, index) => (
                    <div key={index} className="guess-item">
                      {guess.join(', ')}
                    </div>
                  ))}
                </div>
              )}

              {/* Game Over */}
              {player1State.game_over && (
                <div className="player-game-over">
                  <p>All groups found!</p>
                </div>
              )}
            </div>
          </div>

          {/* Player 2 Side */}
          <div className={`player-side ${player2Processing ? 'active' : ''}`}>
            <div className="player-header">
              <h2>{getDisplayName(player2Model)}</h2>
              {player2Processing && <span className="thinking">🤔 Thinking...</span>}
            </div>
            
            <div className="player-stats">
              <div className="stat">
                <span className="stat-label">Groups Found:</span>
                <span className="stat-value">{player2State.found_groups.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Incorrect Guesses:</span>
                <span className="stat-value">{player2State.incorrect_guesses.length}</span>
              </div>
            </div>

            {/* Player 2 Game Board */}
            <div className="player-game-board">
              {/* Found Groups */}
              {player2State.found_groups.length > 0 && (
                <div className="found-groups-small">
                  {player2State.found_groups.map((group, index) => (
                    <div 
                      key={index} 
                      className="found-group-small"
                      style={{ backgroundColor: getLevelColor(group.level) }}
                    >
                      <div className="group-name-small">{group.group_name}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Remaining Words */}
              {player2State.remaining_words.length > 0 && !player2State.game_over && (
                <div className="words-grid-small">
                  {player2State.remaining_words.map((word, index) => (
                    <div key={index} className="word-tile-small">
                      {word}
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Incorrect Guesses */}
              {player2State.incorrect_guesses.length > 0 && (
                <div className="player-guesses">
                  <h4>Recent Guesses:</h4>
                  {player2State.incorrect_guesses.slice(-3).map((guess, index) => (
                    <div key={index} className="guess-item">
                      {guess.join(', ')}
                    </div>
                  ))}
                </div>
              )}

              {/* Game Over */}
              {player2State.game_over && (
                <div className="player-game-over">
                  <p>All groups found!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionsGame; 