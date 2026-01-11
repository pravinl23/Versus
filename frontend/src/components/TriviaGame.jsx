import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TriviaGameView from './TriviaGameView'
import './TriviaGameView.css' // Import CSS to ensure styles are loaded

const TriviaGame = () => {
  const navigate = useNavigate()
  const [gameId, setGameId] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get stored models from sessionStorage (matching how they're stored in ModelSelection)
  const storedPlayer1 = JSON.parse(sessionStorage.getItem('player1Model') || '{}')
  const storedPlayer2 = JSON.parse(sessionStorage.getItem('player2Model') || '{}')
  
  console.log('Stored models:', { storedPlayer1, storedPlayer2 })
  
  const player1Model = {
    id: storedPlayer1.id || 'gpt-4o-mini',
    name: storedPlayer1.name || 'GPT-4o Mini',
    provider: storedPlayer1.provider || 'openai'
  }
  
  const player2Model = {
    id: storedPlayer2.id || 'claude-3-haiku-20240307',
    name: storedPlayer2.name || 'Claude 3 Haiku',
    provider: storedPlayer2.provider || 'anthropic'
  }

  console.log('Using models:', { player1Model, player2Model })

  useEffect(() => {
    console.log('🎮 Starting trivia with models:', { player1Model, player2Model })
    
    // Generate game ID but don't start the game yet - wait for voting
    const newGameId = `trivia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setGameId(newGameId)
  }, [player1Model, player2Model])

  const startNewGame = async () => {
    console.log('Starting new trivia game...')
    setIsLoading(true)
    setError(null)

    try {
      const requestBody = {
        player1_model: player1Model.id,
        player2_model: player2Model.id,
        question_count: 20
      }
      console.log('Request body:', requestBody)

      const response = await fetch('http://localhost:8000/api/trivia/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.detail || 'Failed to start game')
      }

      const data = await response.json()
      console.log('Game started successfully:', data)
      setGameId(data.game_id)
      setGameStarted(true)
    } catch (err) {
      console.error('Error starting trivia game:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGameEnd = () => {
    // Navigate back to games menu
    navigate('/games')
  }

  console.log('Current state:', { isLoading, gameStarted, error, gameId })

  if (error) {
    return (
      <div className="trivia-container">
        <div className="error-screen">
          <h1>ERROR</h1>
          <p>{error}</p>
          <button 
            className="back-button-styled" 
            onClick={() => navigate('/games')}
          >
            BACK TO GAMES
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="trivia-container">
        <div className="loading-screen">
          <div className="loading-text">INITIALIZING TRIVIA...</div>
          <div className="loading-subtext">
            {player1Model.name} VS {player2Model.name}
          </div>
        </div>
      </div>
    )
  }

  // Show the TriviaGameView with pre-game voting system
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