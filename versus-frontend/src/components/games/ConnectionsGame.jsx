import React, { useState, useEffect } from 'react';
import './ConnectionsGame.css';

const ConnectionsGame = ({ player1Model, player2Model, onBack }) => {
  const [gameId, setGameId] = useState(null);
  const [player1State, setPlayer1State] = useState(null);
  const [player2State, setPlayer2State] = useState(null);
  const [loading, setLoading] = useState(true);
  const [player1Processing, setPlayer1Processing] = useState(false);
  const [player2Processing, setPlayer2Processing] = useState(false);
  const [ws, setWs] = useState(null);

  // Start a new game when component mounts
  useEffect(() => {
    startNewGame();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

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

      const data = await response.json();
      setGameId(data.game_id);
      
      // Initialize both player states
      const initialState = {
        puzzle_id: data.puzzle_id,
        date: data.date,
        all_words: data.words,
        remaining_words: data.words,
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
      setLoading(false);
    }
  };

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

  // Auto-play for player 1
  useEffect(() => {
    if (player1State && !player1State.game_over && !player1Processing) {
      const timer = setTimeout(() => {
        processAITurn(1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [player1State, player1Processing]);

  // Auto-play for player 2
  useEffect(() => {
    if (player2State && !player2State.game_over && !player2Processing) {
      const timer = setTimeout(() => {
        processAITurn(2);
      }, 1500); // Slight offset to avoid simultaneous requests
      return () => clearTimeout(timer);
    }
  }, [player2State, player2Processing]);

  if (loading) {
    return (
      <div className="connections-container">
        <div className="loading">Loading NYT Connections...</div>
      </div>
    );
  }

  if (!player1State || !player2State) {
    return (
      <div className="connections-container">
        <div className="error">Failed to load game</div>
      </div>
    );
  }

  const getLevelColor = (level) => {
    const colors = ['#f9df6d', '#a0c35a', '#b0c4ef', '#ba81c5'];
    return colors[level] || '#999';
  };



  return (
    <div className="connections-container">
      <button onClick={onBack} className="back-button">
        ← Back to Menu
      </button>

      <div className="connections-header">
        <h1>NYT Connections</h1>
        <div className="puzzle-info">
          Puzzle #{player1State.puzzle_id} • {player1State.date}
        </div>
      </div>

      <div className="connections-split-view">
        {/* Player 1 Side */}
        <div className={`player-side ${player1Processing ? 'active' : ''}`}>
          <div className="player-header">
            <h2>{player1Model}</h2>
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
            <h2>{player2Model}</h2>
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
  );
};

export default ConnectionsGame; 