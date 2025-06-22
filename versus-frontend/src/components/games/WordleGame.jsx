import { useState, useEffect } from 'react'
import StartBattleModal from './wordle/StartBattleModal'
import ModernGameBoard from './wordle/ModernGameBoard'
import ModernGameInterface from './wordle/ModernGameInterface'
import { useGameLoop } from '../../hooks/useWordleGameLoop'

const WordleGame = ({ player1Model, player2Model, onBack }) => {
  const [secretWord, setSecretWord] = useState('')
  const [showModal, setShowModal] = useState(true)
  const [gameState, setGameState] = useState(null)
  const [latestReasoning, setLatestReasoning] = useState({})
  const [currentTurn, setCurrentTurn] = useState(1)
  const [isThinking, setIsThinking] = useState(false)
  
  const { startGame, getNextMove, isLoading } = useGameLoop()

  const handleStartBattle = async (word) => {
    console.log('Starting battle with word:', word)
    setSecretWord(word)
    setShowModal(false)
    
    // Start the game on backend
    const result = await startGame(word)
    console.log('Start game result:', result)
    if (result) {
      // Start the game loop
      runGameLoop()
    } else {
      console.error('Failed to start game')
              alert('Failed to start game. Make sure the backend server is running on port 5002.')
    }
  }

  const runGameLoop = async () => {
    console.log('Starting SIMULTANEOUS AI race...')
    let gameOver = false
    let roundCount = 0
    const MAX_ROUNDS = 50 // Safety limit
    
    // First, get initial state
    try {
      const response = await fetch('http://localhost:5002/api/wordle/state')
      if (!response.ok) {
        throw new Error('Backend not responding')
      }
      const state = await response.json()
      console.log('Initial game state:', state)
      setGameState(state)
    } catch (err) {
      console.error('Failed to get initial state:', err)
              alert('Failed to connect to backend. Make sure the server is running on port 5002.')
      return
    }
    
    while (!gameOver && roundCount < MAX_ROUNDS) {
      roundCount++
      setCurrentTurn(roundCount)
      setIsThinking(true)
      console.log(`🏁 Round ${roundCount}: Both AIs thinking...`)
      
      // Add delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      try {
        // Both AIs make their moves SIMULTANEOUSLY
        const [openaiPromise, anthropicPromise] = [
          getNextMove('openai'),
          getNextMove('anthropic')
        ]
        
        // Wait for both moves to complete
        const [openaiResult, anthropicResult] = await Promise.all([
          openaiPromise.catch(err => {
            console.error('OpenAI move failed:', err)
            return null
          }),
          anthropicPromise.catch(err => {
            console.error('Anthropic move failed:', err)  
            return null
          })
        ])
        
        // Store reasoning for both models
        if (openaiResult?.detailed_reasoning) {
          setLatestReasoning(prev => ({
            ...prev,
            openai: openaiResult.detailed_reasoning
          }))
        }
        
        if (anthropicResult?.detailed_reasoning) {
          setLatestReasoning(prev => ({
            ...prev,
            anthropic: anthropicResult.detailed_reasoning
          }))
        }
        
        // Get updated game state
        const stateResponse = await fetch('http://localhost:5002/api/wordle/state')
        if (stateResponse.ok) {
          const state = await stateResponse.json()
          console.log(`Round ${roundCount} results:`, state)
          setGameState(state)
          gameOver = state.game_over
          setIsThinking(false)
          
          if (gameOver) {
            console.log(`🎉 GAME OVER! Winner: ${state.winner || 'TIE'}`)
          }
        }
        
      } catch (err) {
        console.error('Error in game round:', err)
        setIsThinking(false)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`Race ended after ${roundCount} rounds`)
  }

  // Calculate game stats for the interface
  const getGameStats = () => {
    if (!gameState) return null
    
    const calculateStats = (guesses, feedback) => {
      let correct = 0
      let partial = 0
      
      feedback.forEach(fb => {
        fb.forEach(status => {
          if (status === 'green') correct++
          else if (status === 'yellow') partial++
        })
      })
      
      return { guesses: guesses.length, correct, partial }
    }
    
    return {
      openai: calculateStats(gameState.models.openai.guesses, gameState.models.openai.feedback),
      anthropic: calculateStats(gameState.models.anthropic.guesses, gameState.models.anthropic.feedback)
    }
  }

  if (showModal) {
    return <StartBattleModal onSubmit={handleStartBattle} onCancel={onBack} />
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-purple-500/30 animate-ping mx-auto"></div>
          </div>
          <div className="text-3xl font-black text-white mb-2">Initializing Battle</div>
          <div className="text-slate-400 text-lg">Setting up AI vs AI confrontation...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto p-6">
          <button 
            onClick={onBack}
            className="mb-6 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Games
          </button>
          
          <div className="text-center">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 mb-3">
              AI WORDLE ARENA
            </h1>
            <p className="text-2xl text-slate-300 mb-6 font-medium">
              GPT-4o vs Claude · Real-Time Battle
            </p>
            
            {gameState.game_over && (
              <div className="mt-8 p-8 rounded-3xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600/30 max-w-2xl mx-auto">
                <div className="text-4xl font-black mb-4">
                  {gameState.winner === 'TIE' ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">🤝 Epic Tie!</span>
                  ) : gameState.winner === 'openai' ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-400">🏆 GPT-4o Victorious!</span>
                  ) : gameState.winner === 'anthropic' ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">🏆 Claude Triumphant!</span>
                  ) : (
                    <span className="text-slate-400">Battle Complete</span>
                  )}
                </div>
                <div className="text-2xl text-slate-300">
                  The secret word was: 
                  <span className="font-black text-3xl text-white px-4 py-2 bg-slate-700 rounded-xl ml-3">
                    {gameState.secret_word}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Sidebar - Game Interface */}
          <div className="col-span-3">
            <ModernGameInterface 
              currentTurn={currentTurn}
              isThinking={isThinking}
              gameStats={getGameStats()}
              strategies={latestReasoning}
              gameState={gameState}
            />
          </div>
          
          {/* Center - Game Boards */}
          <div className="col-span-9">
            <div className="grid grid-cols-2 gap-8">
              
              {/* GPT-4o Board */}
              <div className="space-y-6">
                <ModernGameBoard
                  guesses={gameState.models.openai.guesses}
                  feedback={gameState.models.openai.feedback}
                  modelName="GPT-4o"
                  isWinner={gameState.winner === 'openai'}
                  guessCount={gameState.models.openai.guesses.length}
                />
              </div>
              
              {/* Claude Board */}
              <div className="space-y-6">
                <ModernGameBoard
                  guesses={gameState.models.anthropic.guesses}
                  feedback={gameState.models.anthropic.feedback}
                  modelName="Claude"
                  isWinner={gameState.winner === 'anthropic'}
                  guessCount={gameState.models.anthropic.guesses.length}
                />
              </div>
              
            </div>
            
            {/* Real-time Battle Status */}
            {isThinking && (
              <div className="mt-8 text-center">
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 backdrop-blur-xl rounded-2xl p-6 border border-amber-700/50">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-amber-400 font-bold text-xl">Both AIs are analyzing...</span>
                  </div>
                  <div className="text-slate-300 text-lg">
                    Turn {currentTurn} in progress - Watching real-time AI decision making
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default WordleGame 