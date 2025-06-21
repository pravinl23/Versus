import { useState } from 'react'
import './App.css'

const MODELS = ['GEMINI', 'ANTHROPIC', 'OPENAI', 'GROQ', 'CUSTOM UPLOAD']
const GAMES = [
  { name: 'Soccer', emoji: '⚽', description: '2D soccer match' },
  { name: 'Pong', emoji: '🏓', description: 'Classic arcade game' },
  { name: 'Battleship', emoji: '🚢', description: 'Naval strategy' },
  { name: 'UNO', emoji: '🃏', description: 'Card game chaos' },
  { name: 'Wordle', emoji: '📝', description: 'Word guessing' },
  { name: 'Blackjack', emoji: '🎰', description: 'Beat the dealer' },
  { name: 'Chess', emoji: '♟️', description: 'Strategic warfare' },
  { name: 'Poker', emoji: '💰', description: 'Bluff and bet' }
]

function App() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [player1Model, setPlayer1Model] = useState('')
  const [player2Model, setPlayer2Model] = useState('')

  const handleStartMatch = () => {
    console.log('Starting match:', {
      game: selectedGame.name,
      player1: player1Model,
      player2: player2Model
    })
  }

  const handleBack = () => {
    setSelectedGame(null)
    setPlayer1Model('')
    setPlayer2Model('')
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
      <button className="back-button" onClick={handleBack}>
        ← Back
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
                <option key={model} value={model}>{model}</option>
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
                <option key={model} value={model}>{model}</option>
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
