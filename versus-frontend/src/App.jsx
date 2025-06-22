import { useState } from 'react'
import './App.css'
import Battleship from './components/games/Battleship/Battleship'

const MODELS = ['gemini', 'anthropic', 'openai', 'groq', 'custom']
const GAMES = [
  { name: 'Wordle', emoji: '📝', description: 'Word guessing' },
  { name: 'Trivia', emoji: '🧠', description: 'Test your knowledge' },
  { name: 'NYT Connections', emoji: '🔗', description: 'Find the connections' },
  { name: 'Battleship', emoji: '🚢', description: 'Naval strategy' },
  { name: 'Connect 4', emoji: '🔴', description: 'Four in a row' }
]

function App() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [player1Model, setPlayer1Model] = useState('')
  const [player2Model, setPlayer2Model] = useState('')
  const [gameStarted, setGameStarted] = useState(false)

  const handleStartMatch = () => {
    console.log('Starting match:', {
      game: selectedGame.name,
      player1: player1Model,
      player2: player2Model
    })
    setGameStarted(true)
  }

  const handleBackToMenu = () => {
    setSelectedGame(null)
    setPlayer1Model('')
    setPlayer2Model('')
    setGameStarted(false)
  }

  // If game has started, show the game component
  if (gameStarted && selectedGame) {
    // For now, only Battleship is implemented
    if (selectedGame.name === 'Battleship') {
      return (
        <div className="app">
          <button 
              onClick={handleBackToMenu}
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 1000,
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                margin: 0
              }}
            >
              ← Back to Menu
            </button>
          <Battleship 
            player1Model={player1Model} 
            player2Model={player2Model}
            gameId={`game-${Date.now()}`} // Simple game ID for now
          />
        </div>
      )
    } else {
      return (
        <div className="app">
          <button 
              onClick={handleBackToMenu}
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 1000,
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                margin: 0
              }}
            >
              ← Back to Menu
            </button>
          <div className="game-not-implemented">
            <h2>{selectedGame.name} - Coming Soon!</h2>
            <p>This game is not yet implemented.</p>
          </div>
        </div>
      )
    }
  }

  if (!selectedGame) {
    return (
      <div className="app">
        <div className="main-header">
          <h1 className="title">VERSUS</h1>
          <p className="subtitle">Choose your battleground</p>
        </div>
        
        <div className="games-grid">
          {GAMES.map((game) => (
            <button
              key={game.name}
              className="game-card"
              onClick={() => setSelectedGame(game)}
            >
              <div className="game-emoji">{game.emoji}</div>
              <h3>{game.name}</h3>
              <p className="game-description">{game.description}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <button 
          onClick={handleBackToMenu}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            margin: 0
          }}
        >
          ← Back to Menu
        </button>
      
      <div className="game-setup">
        <div className="selected-game-header">
          <div className="game-emoji large">{selectedGame.emoji}</div>
          <h1>{selectedGame.name}</h1>
        </div>

        <div className="model-selection">
          <div className="player-section">
            <h3>Player 1</h3>
            <select 
              className="model-dropdown" 
              value={player1Model} 
              onChange={(e) => setPlayer1Model(e.target.value)}
            >
              <option value="">Select LLM...</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>{model.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="vs-text">VS</div>

          <div className="player-section">
            <h3>Player 2</h3>
            <select 
              className="model-dropdown" 
              value={player2Model} 
              onChange={(e) => setPlayer2Model(e.target.value)}
            >
              <option value="">Select LLM...</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>{model.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          className="start-button" 
          disabled={!player1Model || !player2Model}
          onClick={handleStartMatch}
        >
          START GAME
        </button>
      </div>
    </div>
  )
}

export default App
