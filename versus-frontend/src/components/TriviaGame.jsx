import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TriviaGameView from './TriviaGameView'
import SidebarVote from './SidebarVote'

const TriviaGame = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [gameId, setGameId] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get models from navigation state
  const { player1Model, player2Model } = location.state || {}

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

  useEffect(() => {
    // Redirect to home if no models selected
    if (!player1Model || !player2Model) {
      navigate('/')
      return
    }

    console.log('🎮 Starting trivia with models:', { player1Model, player2Model })
    
    // Start a new game
    startNewGame()
  }, [player1Model, player2Model, navigate])

  const startNewGame = async () => {
    setIsLoading(true)
    setError(null)

    console.log('📡 Sending trivia start request with models:', { player1Model, player2Model })

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
      console.log('✅ Trivia game started:', data)
      setGameId(data.game_id)
      setGameStarted(true)
    } catch (err) {
      console.error('❌ Error starting trivia game:', err)
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
      <div className="trivia-game-container" style={{ paddingRight: '60px' }}>
        <SidebarVote 
          gameId={gameId} 
          gameName={`Trivia: ${getDisplayName(player1Model)} vs ${getDisplayName(player2Model)}`} 
        />
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
      <div className="trivia-game-container" style={{ paddingRight: '60px' }}>
        <SidebarVote 
          gameId={gameId} 
          gameName={`Trivia: ${getDisplayName(player1Model)} vs ${getDisplayName(player2Model)}`} 
        />
        <div className="loading-screen">
          <div className="spinner" />
          <h2>Initializing Trivia Battle...</h2>
          <p>Setting up the competition between {getDisplayName(player1Model)} and {getDisplayName(player2Model)}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingRight: '60px' }}>
      <SidebarVote 
        gameId={gameId} 
        gameName={`Trivia: ${getDisplayName(player1Model)} vs ${getDisplayName(player2Model)}`} 
      />
      <TriviaGameView 
        gameId={gameId}
        player1Model={player1Model}
        player2Model={player2Model}
        onGameEnd={handleGameEnd}
      />
    </div>
  )
}

export default TriviaGame 