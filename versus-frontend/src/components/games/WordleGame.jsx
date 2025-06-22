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
  const [websocket, setWebsocket] = useState(null);
  const [roastStatus, setRoastStatus] = useState('No roast yet');
  const [wsMessageCount, setWsMessageCount] = useState(0);

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
        
        // Setup WebSocket for post-game interviews
        setupWebSocket(data.game_id);
        
        // Start the game loop
        setTimeout(() => runGameLoop(data.game_id), 1000);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const setupWebSocket = (gameId) => {
    if (websocket) {
      websocket.close();
    }

    const ws = new WebSocket(`ws://localhost:8000/api/vote/ws/${gameId}`);
    
    ws.onopen = () => {
      console.log('📡 WebSocket connected for Wordle interviews');
      console.log(`🔗 Connected to: ws://localhost:8000/api/vote/ws/${gameId}`);
      
      // Send a test message to verify connection
      ws.send(JSON.stringify({ type: 'ping' }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);
        setWsMessageCount(prev => prev + 1);
        setRoastStatus(`📨 WS: ${data.type}`);
        
        if (data.type === 'pong') {
          console.log('🏓 WebSocket ping-pong successful');
          return;
        }
        
        if (data.type === 'post_game_interviews') {
          console.log('🔥 Received post-game roast data:', data.interviews);
          setRoastStatus('🔥 Roast received!');
          
          // Auto-play winner roast audio without modal
          if (data.interviews.winner && data.interviews.winner.audio_url) {
            console.log('🎵 Auto-playing winner roast audio...');
            console.log('🎵 Audio URL:', data.interviews.winner.audio_url);
            
            // Test if audio URL is accessible first
            fetch(data.interviews.winner.audio_url, { method: 'HEAD' })
              .then(response => {
                console.log(`🔍 Audio accessibility test: ${response.status} ${response.statusText}`);
                console.log(`🎵 Content-Type: ${response.headers.get('content-type')}`);
                
                if (response.ok) {
                  // URL is accessible, try to play
                  setTimeout(() => {
                    const audio = new Audio(data.interviews.winner.audio_url);
                    
                    audio.onloadstart = () => {
                      console.log('📥 Loading roast audio...');
                    };
                    
                    audio.oncanplay = () => {
                      console.log('✅ Roast audio ready to play');
                    };
                    
                    audio.onplay = () => {
                      console.log('▶️ 🔥 ROAST PLAYING:', data.interviews.winner.personality);
                      console.log('💬 Roast:', data.interviews.winner.response || data.interviews.winner.text);
                      setRoastStatus('🎵 Playing roast!');
                    };
                    
                    audio.onended = () => {
                      console.log('✅ Roast completed - savage!');
                      setRoastStatus('✅ Roast completed!');
                    };
                    
                    audio.onerror = (e) => {
                      console.error('❌ Failed to play roast audio:', e);
                      console.error('❌ Audio error details:', audio.error);
                    };
                    
                    // Try to auto-play the roast
                    audio.play().catch(error => {
                      console.error('❌ Audio autoplay blocked by browser:', error);
                      console.log('🎯 Adding click handler to enable audio...');
                      
                      // Create a temporary click handler to play audio
                      const enableAudio = () => {
                        console.log('🎵 User clicked - attempting to play roast...');
                        audio.play().then(() => {
                          console.log('✅ Audio playing after user interaction!');
                          document.removeEventListener('click', enableAudio);
                        }).catch(e => {
                          console.error('❌ Still failed to play audio:', e);
                        });
                      };
                      
                      document.addEventListener('click', enableAudio, { once: true });
                      
                      // Show a visual indicator that audio is ready
                      console.log('👆 Click anywhere on the page to hear the roast!');
                      setRoastStatus('👆 Click anywhere to play roast!');
                    });
                    
                  }, 1500);
                                 } else {
                   console.error(`❌ Audio URL not accessible: ${response.status}`);
                   setRoastStatus(`❌ Audio URL error: ${response.status}`);
                 }
              })
              .catch(error => {
                console.error('❌ Error testing audio URL:', error);
                console.log('🔄 Trying to play anyway...');
                
                // Try to play despite the error
                setTimeout(() => {
                  const audio = new Audio(data.interviews.winner.audio_url);
                  audio.play().catch(e => {
                    console.error('❌ Fallback audio play failed:', e);
                  });
                }, 1500);
              });
              
          } else if (data.interviews.winner) {
            console.log('📝 Roast generated but no audio - text only:', data.interviews.winner.response);
            setRoastStatus('📝 Text roast only (no audio)');
          } else {
            console.log('❌ No winner data in roast response');
            setRoastStatus('❌ No winner data received');
          }
        } else {
          console.log('📨 Other WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error, event.data);
      }
    };
    
    ws.onclose = () => {
      console.log('📡 WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setWebsocket(ws);
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

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
          setRoastStatus('🏁 Game ended - waiting for roast...');
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
              // Removed thinking animation to prevent moving rectangles
              
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

                {/* Audio Debug Panel */}
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1000,
            maxWidth: '350px',
            minHeight: '120px'
          }}>
                         <div>🔊 Audio Debug</div>
             <div>WebSocket: {websocket ? '✅' : '❌'}</div>
             <div>Messages: {wsMessageCount}</div>
             <div>Status: {roastStatus}</div>
            <button 
              onClick={() => {
                console.log('🧪 Manual audio test');
                const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBFCJx/DJeypjEhFN1ue5QALLv8rVnUcZCrV+h4DAhLDAVNE1bDdJQGxLOKNYUUYlJQJQeEQRExVTpDEDq+dLGnFGHTEPjgoxQcm1TIiLgqxVoNvS1xFd2jFf6T1s3YrjGl7kFQFjQfYELIzF1ZZELQnXzO9oT8zXRw'); 
                testAudio.play()
                  .then(() => console.log('✅ Test audio played'))
                  .catch(e => console.error('❌ Test audio failed:', e));
              }}
              style={{
                background: '#333',
                color: 'white', 
                border: 'none',
                padding: '5px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px',
                marginTop: '5px'
              }}
                         >
               🧪 Test Audio
             </button>
             <button 
               onClick={() => {
                 console.log('🔥 Testing actual roast audio...');
                 const roastAudio = new Audio('/static/interviews/interview_28bbd51b-07f8-4cda-bb16-10c17ed4b3d6_winner_1750612054.mp3');
                 roastAudio.onplay = () => {
                   console.log('✅ Real roast audio playing!');
                   setRoastStatus('🎵 Manual roast test playing!');
                 };
                 roastAudio.onended = () => {
                   console.log('✅ Real roast audio ended');
                   setRoastStatus('✅ Manual roast test completed!');
                 };
                 roastAudio.onerror = (e) => {
                   console.error('❌ Real roast audio failed:', e);
                   setRoastStatus('❌ Manual roast test failed!');
                 };
                 roastAudio.play()
                   .then(() => console.log('✅ Manual roast started'))
                   .catch(e => {
                     console.error('❌ Manual roast blocked:', e);
                     setRoastStatus('👆 Click needed for manual roast!');
                   });
               }}
               style={{
                 background: '#333',
                 color: 'white', 
                 border: 'none',
                 padding: '5px',
                 borderRadius: '3px',
                 cursor: 'pointer',
                 fontSize: '10px',
                 marginTop: '5px',
                 marginLeft: '5px'
               }}
             >
                               🔥 Test Roast
              </button>
              <button 
                onClick={() => {
                  console.log('🎵 Enabling audio context...');
                  // Create a dummy audio to enable audio context
                  const dummyAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBFCJx/DJeypjEhFN1ue5QALLv8rVnUcZCrV+h4DAhLDAVNE1bDdJQGxLOKNYUUYlJQJQeEQRExVTpDEDq+dLGnFGHTEPjgoxQcm1TIiLgqxVoNvS1xFd2jFf6T1s3YrjGl7kFQFjQfYELIzF1ZZELQnXzO9oT8zXRw'); 
                  dummyAudio.play()
                    .then(() => {
                      console.log('✅ Audio context enabled!');
                      setRoastStatus('✅ Audio enabled - roasts will auto-play!');
                    })
                    .catch(e => {
                      console.error('❌ Failed to enable audio:', e);
                      setRoastStatus('❌ Audio enable failed!');
                    });
                }}
                style={{
                  background: '#008000',
                  color: 'white', 
                  border: 'none',
                  padding: '5px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  marginTop: '5px',
                  marginLeft: '5px'
                }}
              >
                🎵 Enable Audio
              </button>
          </div>

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

      {/* Audio auto-plays when roast is generated */}
    </div>
  );
};

export default WordleGame; 