"use client"

import { useState } from "react"
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom"
import "./App.css"
import Battleship from "./components/games/Battleship/Battleship"
import TriviaGame from "./components/TriviaGame"
import WordleGame from "./components/games/WordleGame"
import NewLandingPage from "./pages/LandingPage"
import ModelSelection from "./pages/ModelSelection"

const MODELS = ["gemini", "anthropic", "openai", "groq", "custom"]
const GAMES = [
  { name: "Wordle", emoji: "📝", description: "Word guessing" },
  { name: "Trivia", emoji: "🧠", description: "Test your knowledge" },
  { name: "NYT Connections", emoji: "🔗", description: "Find the connections" },
  { name: "Battleship", emoji: "🚢", description: "Naval strategy" },
  { name: "Connect 4", emoji: "🔴", description: "Four in a row" },
]

function MainMenu() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState(null)
  
  // Get pre-selected models from sessionStorage
  const storedPlayer1 = JSON.parse(sessionStorage.getItem('player1Model') || '{}')
  const storedPlayer2 = JSON.parse(sessionStorage.getItem('player2Model') || '{}')
  
  const [player1Model, setPlayer1Model] = useState(storedPlayer1.id || "")
  const [player2Model, setPlayer2Model] = useState(storedPlayer2.id || "")
  const [gameStarted, setGameStarted] = useState(false)

  const handleStartMatch = () => {
    if (selectedGame.name === "Trivia") {
      navigate("/trivia", {
        state: {
          player1Model,
          player2Model,
        },
      })
    } else if (selectedGame.name === "Wordle") {
      console.log("Starting match:", {
        game: selectedGame.name,
        player1: player1Model,
        player2: player2Model,
      })
      setGameStarted(true)
    } else if (selectedGame.name === "Battleship") {
      console.log("Starting match:", {
        game: selectedGame.name,
        player1: player1Model,
        player2: player2Model,
      })
      setGameStarted(true)
    } else {
      console.log("Starting match:", {
        game: selectedGame.name,
        player1: player1Model,
        player2: player2Model,
      })
    }
  }

  const handleBackToMenu = () => {
    setSelectedGame(null)
    setPlayer1Model("")
    setPlayer2Model("")
    setGameStarted(false)
  }

  const handleBack = () => {
    setGameStarted(false)
  }

  // If game has started, show the appropriate game component
  if (gameStarted && selectedGame) {
    // Handle Battleship
    if (selectedGame.name === "Battleship") {
      return (
        <div className="app">
          <button
            onClick={handleBackToMenu}
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 1000,
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
              margin: 0,
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
    }
    // Handle Wordle
    else if (selectedGame.name === "Wordle") {
      return <WordleGame player1Model={player1Model} player2Model={player2Model} onBack={handleBack} />
    }
    // Handle other games that aren't implemented yet
    else {
      return (
        <div className="app">
          <button
            onClick={handleBackToMenu}
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 1000,
              background: "rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.9rem",
              margin: 0,
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
        <button
          onClick={() => navigate("/")}
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            color: "#fff",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
            margin: 0,
          }}
        >
          ← Back to Home
        </button>
        <div className="main-header">
          <h1 className="title">VERSUS</h1>
          <p className="subtitle">Choose your battleground</p>
        </div>

        <div className="games-grid">
          {GAMES.map((game) => (
            <button key={game.name} className="game-card" onClick={() => setSelectedGame(game)}>
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
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          color: "#fff",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "0.9rem",
          margin: 0,
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
            <select className="model-dropdown" value={player1Model} onChange={(e) => setPlayer1Model(e.target.value)}>
              <option value="">Select LLM...</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="vs-text">VS</div>

          <div className="player-section">
            <h3>Player 2</h3>
            <select className="model-dropdown" value={player2Model} onChange={(e) => setPlayer2Model(e.target.value)}>
              <option value="">Select LLM...</option>
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="start-button"
          disabled={
            !player1Model ||
            !player2Model ||
            (selectedGame.name === "Wordle" &&
              (!["openai", "anthropic"].includes(player1Model.toLowerCase()) ||
                !["openai", "anthropic"].includes(player2Model.toLowerCase())))
          }
          onClick={handleStartMatch}
        >
          {selectedGame.name === "Wordle" &&
          (!["openai", "anthropic"].includes(player1Model.toLowerCase()) ||
            !["openai", "anthropic"].includes(player2Model.toLowerCase()))
            ? "Wordle only supports OpenAI and Anthropic"
            : "START GAME"}
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NewLandingPage />} />
        <Route path="/model-selection" element={<ModelSelection />} />
        <Route path="/games" element={<MainMenu />} />
        <Route path="/trivia" element={<TriviaGame />} />
      </Routes>
    </Router>
  )
}

export default App
