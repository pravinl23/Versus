import React, { useState, useEffect, useRef } from 'react'
import './TriviaGameView.css'

const MODELS_INFO = {
  'OPENAI': { name: 'GPT-4', color: '#10a37f', emoji: '🤖' },
  'ANTHROPIC': { name: 'Claude 3', color: '#d97706', emoji: '🧠' },
  'GEMINI': { name: 'Gemini Pro', color: '#4285f4', emoji: '✨' },
  'GROQ': { name: 'Mixtral', color: '#f59e0b', emoji: '⚡' }
}

const TriviaGameView = ({ gameId, player1Model, player2Model, onGameEnd }) => {
  const [gameState, setGameState] = useState({
    currentQuestion: 0,
    totalQuestions: 20,
    player1Score: 0,
    player2Score: 0,
    gameOver: false,
    winner: null
  })
  
  const [currentQuestionData, setCurrentQuestionData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [responses, setResponses] = useState([])
  const [showingResult, setShowingResult] = useState(false)
  const [websocket, setWebsocket] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)
  
  const wsRef = useRef(null)

  // WebSocket connection
  useEffect(() => {
    if (gameId) {
      const ws = new WebSocket(`ws://localhost:8000/api/trivia/ws/${gameId}`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setWebsocket(ws)
        wsRef.current = ws
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        if (message.type === 'question_result') {
          handleQuestionResult(message.data)
        } else if (message.type === 'game_over') {
          handleGameOver(message.data)
        } else if (message.type === 'error') {
          console.error('Game error:', message.message)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
      }
      
      return () => {
        if (ws) {
          ws.close()
        }
      }
    }
  }, [gameId])

  const handleQuestionResult = (result) => {
    setCurrentQuestionData(result)
    setShowingResult(true)
    setIsLoading(false)
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      currentQuestion: result.question_number,
      player1Score: prev.player1Score + (result.player1_correct ? 1 : 0),
      player2Score: prev.player2Score + (result.player2_correct ? 1 : 0)
    }))
    
    // Add to responses history
    setResponses(prev => [...prev, result])
  }

  const handleGameOver = (finalResults) => {
    setGameState(prev => ({
      ...prev,
      gameOver: true,
      winner: finalResults.winner,
      player1Score: finalResults.final_scores.player1,
      player2Score: finalResults.final_scores.player2
    }))
  }

  const startNextQuestion = async () => {
    if (gameState.gameOver) return
    
    setIsLoading(true)
    setShowingResult(false)
    setCurrentQuestionData(null)
    
    try {
      const response = await fetch(`http://localhost:8000/api/trivia/game/${gameId}/next-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to get next question')
      }
      
      // Result will come through WebSocket
    } catch (error) {
      console.error('Error getting next question:', error)
      setIsLoading(false)
    }
  }

  const startGame = () => {
    setGameStarted(true)
    startNextQuestion()
  }

  const getModelInfo = (modelType) => {
    return MODELS_INFO[modelType] || { name: modelType, color: '#6b7280', emoji: '🤖' }
  }

  const player1Info = getModelInfo(player1Model)
  const player2Info = getModelInfo(player2Model)

  if (!gameStarted) {
    return (
      <div className="trivia-game-container">
        <div className="game-start-screen">
          <h1>🧠 TRIVIA BATTLE</h1>
          
          <div className="vs-setup">
            <div className="player-card">
              <div className="player-emoji">{player1Info.emoji}</div>
              <h3>{player1Info.name}</h3>
              <p>Player 1</p>
            </div>
            
            <div className="vs-divider">VS</div>
            
            <div className="player-card">
              <div className="player-emoji">{player2Info.emoji}</div>
              <h3>{player2Info.name}</h3>
              <p>Player 2</p>
            </div>
          </div>
          
          <div className="game-info">
            <p>20 questions • Multiple choice and short answer</p>
            <p>Speed and accuracy matter!</p>
          </div>
          
          <button className="start-game-btn" onClick={startGame}>
            START TRIVIA BATTLE
          </button>
        </div>
      </div>
    )
  }

  if (gameState.gameOver) {
    return (
      <div className="trivia-game-container">
        <div className="game-over-screen">
          <h1>🏆 GAME OVER</h1>
          
          <div className="final-scores">
            <div className={`final-score-card ${gameState.winner === 1 ? 'winner' : ''}`}>
              <div className="player-emoji">{player1Info.emoji}</div>
              <h3>{player1Info.name}</h3>
              <div className="score">{gameState.player1Score}</div>
              {gameState.winner === 1 && <div className="winner-badge">WINNER!</div>}
            </div>
            
            <div className={`final-score-card ${gameState.winner === 2 ? 'winner' : ''}`}>
              <div className="player-emoji">{player2Info.emoji}</div>
              <h3>{player2Info.name}</h3>
              <div className="score">{gameState.player2Score}</div>
              {gameState.winner === 2 && <div className="winner-badge">WINNER!</div>}
            </div>
          </div>
          
          <button className="new-game-btn" onClick={onGameEnd}>
            NEW GAME
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="trivia-game-container">
      {/* Game Header */}
      <div className="game-header">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(gameState.currentQuestion / gameState.totalQuestions) * 100}%` }}
          />
        </div>
        <div className="question-counter">
          Question {gameState.currentQuestion} of {gameState.totalQuestions}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="score-card" style={{ borderColor: player1Info.color }}>
          <div className="player-info">
            <span className="player-emoji">{player1Info.emoji}</span>
            <span className="player-name">{player1Info.name}</span>
          </div>
          <div className="score">{gameState.player1Score}</div>
        </div>
        
        <div className="vs-indicator">VS</div>
        
        <div className="score-card" style={{ borderColor: player2Info.color }}>
          <div className="player-info">
            <span className="player-emoji">{player2Info.emoji}</span>
            <span className="player-name">{player2Info.name}</span>
          </div>
          <div className="score">{gameState.player2Score}</div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-area">
        {isLoading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Models are thinking...</p>
          </div>
        )}

        {currentQuestionData && showingResult && (
          <div className="question-result">
            <div className="question-display">
              <h3>{currentQuestionData.question.question}</h3>
              {currentQuestionData.question.choices && (
                <div className="choices">
                  {currentQuestionData.question.choices.map((choice, index) => (
                    <div 
                      key={index} 
                      className={`choice ${currentQuestionData.correct_answer === String.fromCharCode(65 + index) ? 'correct' : ''}`}
                    >
                      {String.fromCharCode(65 + index)}. {choice}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="responses">
              <div className={`response-card ${currentQuestionData.player1_correct ? 'correct' : 'incorrect'}`}>
                <div className="response-header">
                  <span className="player-info">
                    {player1Info.emoji} {player1Info.name}
                  </span>
                  <span className="response-time">
                    {currentQuestionData.player1_time.toFixed(2)}s
                  </span>
                </div>
                <div className="response-text">
                  {currentQuestionData.player1_response}
                </div>
                <div className="result-indicator">
                  {currentQuestionData.player1_correct ? '✅' : '❌'}
                </div>
              </div>

              <div className={`response-card ${currentQuestionData.player2_correct ? 'correct' : 'incorrect'}`}>
                <div className="response-header">
                  <span className="player-info">
                    {player2Info.emoji} {player2Info.name}
                  </span>
                  <span className="response-time">
                    {currentQuestionData.player2_time.toFixed(2)}s
                  </span>
                </div>
                <div className="response-text">
                  {currentQuestionData.player2_response}
                </div>
                <div className="result-indicator">
                  {currentQuestionData.player2_correct ? '✅' : '❌'}
                </div>
              </div>
            </div>

            <div className="correct-answer">
              <strong>Correct Answer:</strong> {currentQuestionData.correct_answer}
            </div>

            <button 
              className="next-question-btn" 
              onClick={startNextQuestion}
              disabled={gameState.currentQuestion >= gameState.totalQuestions}
            >
              {gameState.currentQuestion >= gameState.totalQuestions ? 'Game Complete' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TriviaGameView 