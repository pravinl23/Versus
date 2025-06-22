import { useState } from 'react'

export const useGameLoop = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const API_BASE = 'http://localhost:5001/api/wordle'
  
  const startGame = async (secretWord) => {
    try {
      console.log('Starting game with API call to:', `${API_BASE}/start`)
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret_word: secretWord }),
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to start game: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Game started successfully:', data)
      return data
    } catch (err) {
      console.error('Failed to start game:', err)
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }
  
  const getNextMove = async (model) => {
    try {
      console.log('Getting next move for model:', model)
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model }),
      })
      
      console.log('Guess response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error getting move:', errorText)
        throw new Error(`Failed to get move: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Got move:', data)
      return data
    } catch (err) {
      console.error('Failed to get next move:', err)
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }
  
  return {
    startGame,
    getNextMove,
    isLoading,
    error,
  }
} 