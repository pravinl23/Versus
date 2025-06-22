import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TriviaGameView from './TriviaGameView'

const TriviaGame = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [gameId, setGameId] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get models from navigation state
  const { player1Model, player2Model } = location.state || {}

  useEffect(() => {
    // Redirect to home if no models selected
    if (!player1Model || !player2Model) {
      navigate('/')
      return
    }

    // Start a new game
    startNewGame()
  }, [player1Model, player2Model, navigate])

  const startNewGame = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8000/api/trivia/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player1_model: player1Model,
          player2_model: player2Model,
          question_count: 20
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to start game')
      }

      const data = await response.json()
      setGameId(data.game_id)
      setGameStarted(true)
    } catch (err) {
      console.error('Error starting game:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGameEnd = () => {
    // Clean up the game session
    if (gameId) {
      fetch(`http://localhost:8000/api/trivia/game/${gameId}`, {
        method: 'DELETE'
      }).catch(console.error)
    }
    
    // Navigate back to main menu
    navigate('/')
  }

  if (!player1Model || !player2Model) {
    return null // Will redirect
  }

  if (error) {
    return (
      <div className="trivia-game-container">
        <div className="error-screen">
          <h1>🚨 Error</h1>
          <p>{error}</p>
          <button 
            className="back-btn" 
            onClick={() => navigate('/')}
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !gameStarted) {
    return (
      <div className="trivia-game-container">
        <div className="loading-screen">
          <div className="spinner" />
          <h2>Initializing Trivia Battle...</h2>
          <p>Setting up the competition between {player1Model} and {player2Model}</p>
        </div>
      </div>
    )
  }

  return (
    <TriviaGameView 
      gameId={gameId}
      player1Model={player1Model}
      player2Model={player2Model}
      onGameEnd={handleGameEnd}
    />
  )
}

export default TriviaGame 