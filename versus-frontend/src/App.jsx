import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import TriviaGame from './components/TriviaGame'
import WordleGame from './components/games/WordleGame'

const MODELS = ['GEMINI', 'ANTHROPIC', 'OPENAI', 'GROQ', 'CUSTOM UPLOAD']
const GAMES = [
  { name: 'Wordle', emoji: '📝', description: 'Word guessing' },
  { name: 'Trivia', emoji: '🧠', description: 'Test your knowledge' },
  { name: 'NYT Connections', emoji: '🔗', description: 'Find the connections' },
  { name: 'Battleship', emoji: '🚢', description: 'Naval strategy' },
  { name: 'Connect 4', emoji: '🔴', description: 'Four in a row' }
]

function MainMenu() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState(null)
  const [player1Model, setPlayer1Model] = useState('')
  const [player2Model, setPlayer2Model] = useState('')
  const [gameStarted, setGameStarted] = useState(false)

  const handleStartMatch = () => {

    if (selectedGame.name === 'Trivia') {
      navigate('/trivia', { 
        state: { 
          player1Model, 
          player2Model 
        } 
      })
    } else {
      console.log('Starting match:', {
        game: selectedGame.name,
        player1: player1Model,
        player2: player2Model
      })
    }
  }

  const handleBack = () => {
    setSelectedGame(null)
    setPlayer1Model('')
    setPlayer2Model('')
    setGameStarted(false)
  }

  // If game is started and it's Wordle
  if (gameStarted && selectedGame?.name === 'Wordle') {
    return (
      <WordleGame 
        player1Model={player1Model}
        player2Model={player2Model}
        onBack={handleBack}
      />
    )
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
          disabled={!player1Model || !player2Model || (selectedGame.name === 'Wordle' && (!['OPENAI', 'ANTHROPIC'].includes(player1Model) || !['OPENAI', 'ANTHROPIC'].includes(player2Model)))}
          onClick={handleStartMatch}
        >
          {selectedGame.name === 'Wordle' && (!['OPENAI', 'ANTHROPIC'].includes(player1Model) || !['OPENAI', 'ANTHROPIC'].includes(player2Model)) 
            ? 'Wordle only supports OpenAI and Anthropic'
            : 'START GAME'}
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/trivia" element={<TriviaGame />} />
      </Routes>
    </Router>
  )
}

export default App
