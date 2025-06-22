import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './wordle/Wordle.css';

const WordleGame = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({
    player1: {
      guesses: [],
      feedback: [],
      reasoning: [],
      currentGuess: '',
      isThinking: false
    },
    player2: {
      guesses: [],
      feedback: [],
      reasoning: [],
      currentGuess: '',
      isThinking: false
    },
    gameOver: false,
    winner: null,
    secretWord: null,
    gameStarted: false
  });
  
  const [selectedWord, setSelectedWord] = useState('');
  const [gameId, setGameId] = useState(null);
  const [showStartModal, setShowStartModal] = useState(true);

  // Get stored models from localStorage
  const storedModels = JSON.parse(localStorage.getItem('selectedModels') || '{}');
  const player1Model = storedModels.player1 || { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' };
  const player2Model = storedModels.player2 || { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' };

  const wordList = [
    'CRANE', 'SLATE', 'AUDIO', 'HOUSE', 'ROUND',
    'TRAIN', 'LIGHT', 'BRAIN', 'CLOUD', 'PIANO',
    'BEACH', 'CHAIR', 'DANCE', 'EAGLE', 'FLAME',
    'GRAPE', 'HEART', 'IVORY', 'JOKER', 'KNIFE',
    'LEMON', 'MOUSE', 'NIGHT', 'OCEAN', 'PEACH',
    'QUEST', 'ROBIN', 'SNAKE', 'TIGER', 'ULTRA',
    'VOICE', 'WATER', 'YOUTH', 'ZEBRA', 'TESTS'
  ];

  const startGame = async () => {
    const word = selectedWord || wordList[Math.floor(Math.random() * wordList.length)];
    
    try {
      const response = await fetch('http://localhost:8000/api/wordle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_word: word })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameId(data.game_id);
        setShowStartModal(false);
        setGameState(prev => ({ ...prev, gameStarted: true }));
        
        // Start the game loop
        setTimeout(() => runGameLoop(data.game_id), 1000);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const runGameLoop = async (gameId) => {
    let gameActive = true;
    const models = ['openai', 'anthropic'];
    
    while (gameActive) {
      // Make moves for both players in parallel
      const movePromises = models.map(model => makeGuess(gameId, model));
      const results = await Promise.allSettled(movePromises);
      
      // Check if game is over
      const gameOver = results.some(result => 
        result.status === 'fulfilled' && result.value && result.value.game_over
      );
      
      if (gameOver) {
        gameActive = false;
        // Get final state
        const stateResponse = await fetch(`http://localhost:8000/api/wordle/state/${gameId}`);
        if (stateResponse.ok) {
          const finalState = await stateResponse.json();
          setGameState(prev => ({
            ...prev,
            gameOver: true,
            winner: finalState.winner,
            secretWord: finalState.secret_word
          }));
        }
      }
      
      // Small delay between rounds
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  };

  const makeGuess = async (gameId, model) => {
    const playerKey = model === 'openai' ? 'player1' : 'player2';
    
    // Show thinking state
    setGameState(prev => ({
      ...prev,
      [playerKey]: { ...prev[playerKey], isThinking: true }
    }));
    
    try {
      const response = await fetch(`http://localhost:8000/api/wordle/guess/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (!result.error) {
          setGameState(prev => ({
            ...prev,
            [playerKey]: {
              guesses: [...prev[playerKey].guesses, result.guess],
              feedback: [...prev[playerKey].feedback, result.feedback],
              reasoning: [...prev[playerKey].reasoning, result.reasoning],
              currentGuess: '',
              isThinking: false
            }
          }));
        }
        
        return result;
      }
    } catch (error) {
      console.error(`Error making guess for ${model}:`, error);
      setGameState(prev => ({
        ...prev,
        [playerKey]: { ...prev[playerKey], isThinking: false }
      }));
    }
  };

  const renderGrid = (player, playerKey) => {
    const guesses = gameState[playerKey].guesses;
    const feedback = gameState[playerKey].feedback;
    const isThinking = gameState[playerKey].isThinking;
    
    return (
      <div className="wordle-grid">
        {[...Array(6)].map((_, rowIndex) => (
          <div key={rowIndex} className="wordle-row">
            {[...Array(5)].map((_, colIndex) => {
              const guess = guesses[rowIndex];
              const letter = guess ? guess[colIndex] : '';
              const feedbackValue = feedback[rowIndex] ? feedback[rowIndex][colIndex] : '';
              
              let tileClass = 'wordle-tile';
              if (feedbackValue === 'green') tileClass += ' correct';
              else if (feedbackValue === 'yellow') tileClass += ' present';
              else if (feedbackValue === 'black') tileClass += ' absent';
              else if (rowIndex === guesses.length && isThinking) {
                tileClass += ' thinking';
              }
              
              return (
                <div key={colIndex} className={tileClass}>
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="wordle-container">
      {/* Back Button */}
      <button 
        className="back-button"
        onClick={() => navigate('/games')}
      >
        ← Back to Games
      </button>

      {/* Start Modal */}
      {showStartModal && (
        <div className="wordle-modal">
          <div className="wordle-modal-content">
            <h2>Start Wordle Battle</h2>
            <div className="word-selection">
              <p>Choose a word or let us pick randomly:</p>
              <input
                type="text"
                placeholder="Enter 5-letter word"
                value={selectedWord}
                onChange={(e) => setSelectedWord(e.target.value.toUpperCase().slice(0, 5))}
                maxLength={5}
              />
              <p className="word-hint">Leave empty for random word</p>
            </div>
            <button onClick={startGame} className="start-button">
              Start Battle
            </button>
          </div>
        </div>
      )}

      {/* Game Content */}
      {gameState.gameStarted && (
        <div className="wordle-game">
          {/* Header */}
          <div className="wordle-header">
            <h1>WORDLE BATTLE</h1>
            {gameState.gameOver && (
              <div className="game-result">
                <h2>{gameState.winner === 'openai' ? player1Model.name : player2Model.name} Wins!</h2>
                <p>The word was: <strong>{gameState.secretWord}</strong></p>
              </div>
            )}
          </div>

          {/* Game Board */}
          <div className="wordle-board">
            {/* Player 1 Side */}
            <div className="player-section">
              <div className="player-header">
                <h2>{player1Model.name}</h2>
                <span className="provider">{player1Model.provider}</span>
              </div>
              {renderGrid(player1Model, 'player1')}
              <div className="guess-count">
                Guesses: {gameState.player1.guesses.length}/6
              </div>
            </div>

            {/* VS Divider */}
            <div className="vs-divider">
              <div className="vs-text">VS</div>
            </div>

            {/* Player 2 Side */}
            <div className="player-section">
              <div className="player-header">
                <h2>{player2Model.name}</h2>
                <span className="provider">{player2Model.provider}</span>
              </div>
              {renderGrid(player2Model, 'player2')}
              <div className="guess-count">
                Guesses: {gameState.player2.guesses.length}/6
              </div>
            </div>
          </div>

          {/* Play Again Button */}
          {gameState.gameOver && (
            <div className="play-again-container">
              <button 
                className="play-again-button"
                onClick={() => window.location.reload()}
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordleGame; 