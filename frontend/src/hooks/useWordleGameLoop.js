import { useState, useCallback } from 'react'

const BACKEND_URL = 'http://localhost:5002'

export const useGameLoop = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const startGame = useCallback(async (secretWord) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/wordle/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret_word: secretWord }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to start game')
      }
      
      const data = await response.json()
      return data.success
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const getNextMove = useCallback(async (model) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wordle/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get move')
      }
      
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error getting move:', err)
      return null
    }
  }, [])
  
  return {
    startGame,
    getNextMove,
    isLoading,
    error,
  }
} 