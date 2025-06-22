"use client"

import { useState } from "react"
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom"
import "./App.css"
import Battleship from "./components/games/Battleship/Battleship"
import TriviaGame from "./components/TriviaGame"
import WordleGame from "./components/games/WordleGame"
import ConnectionsGame from "./components/games/ConnectionsGame"
import SimpleDebateGame from "./components/SimpleDebateGame"
import NewLandingPage from "./pages/LandingPage"
import ModelSelection from "./pages/ModelSelection"
import VotePage from "./pages/VotePage"

const GAMES = [
  { name: "Wordle", emoji: "📝", description: "Word guessing" },
  { name: "Trivia", emoji: "🧠", description: "Test your knowledge" },
  { name: "NYT Connections", emoji: "🔗", description: "Find the connections" },
  { name: "Battleship", emoji: "🚢", description: "Naval strategy" },
  { name: "Connect 4", emoji: "🔴", description: "Four in a row" },
  { name: "Debate", emoji: "🎭", description: "AI argument showdown" }
]

function MainMenu() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState(null)
  
  // Get pre-selected models from sessionStorage (from model selection page)
  const storedPlayer1 = JSON.parse(sessionStorage.getItem('player1Model') || '{}')
  const storedPlayer2 = JSON.parse(sessionStorage.getItem('player2Model') || '{}')
  
  const [player1Model, setPlayer1Model] = useState(storedPlayer1.id || "openai")
  const [player2Model, setPlayer2Model] = useState(storedPlayer2.id || "anthropic")
  const [gameStarted, setGameStarted] = useState(false)

  const handleGameSelect = (game) => {
    // Start game immediately when selected
    if (game.name === "Trivia") {
      navigate("/trivia", {
        state: {
          player1Model,
          player2Model,
        },
      })
    } else if (game.name === "Debate") {
      navigate('/debate', { 
        state: { 
          player1Model, 
          player2Model 
        } 
      })
    } else if (game.name === "Wordle") {
      console.log("Starting match:", {
        game: game.name,
        player1: player1Model,
        player2: player2Model,
      })
      setSelectedGame(game)
      setGameStarted(true)
    } else if (game.name === "Battleship") {
      console.log("Starting match:", {
        game: game.name,
        player1: player1Model,
        player2: player2Model,
      })
      setSelectedGame(game)
      setGameStarted(true)
    } else if (game.name === "NYT Connections") {
      console.log("Starting match:", {
        game: game.name,
        player1: player1Model,
        player2: player2Model,
      })
      setSelectedGame(game)
      setGameStarted(true)
    } else {
      console.log("Starting match:", {
        game: game.name,
        player1: player1Model,
        player2: player2Model,
      })
      setSelectedGame(game)
    }
  }

  const handleBackToMenu = () => {
    setSelectedGame(null)
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
    // Handle NYT Connections
    else if (selectedGame.name === "NYT Connections") {
      return <ConnectionsGame player1Model={player1Model} player2Model={player2Model} onBack={handleBackToMenu} />
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

  // Show games grid with selected models - no intermediate setup screen needed
  if (!gameStarted) {
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
          <div className="selected-models-display">
            <span className="model-name">{storedPlayer1.name || "GPT-4o"}</span> VS <span className="model-name">{storedPlayer2.name || "Claude 3"}</span>
          </div>
        </div>

        <div className="games-grid">
          {GAMES.map((game) => (
            <button key={game.name} className="game-card" onClick={() => handleGameSelect(game)}>
              <div className="game-emoji">{game.emoji}</div>
              <h3>{game.name}</h3>
              <p className="game-description">{game.description}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // This should never be reached since games start immediately
  return null
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NewLandingPage />} />
        <Route path="/model-selection" element={<ModelSelection />} />
        <Route path="/games" element={<MainMenu />} />
        <Route path="/trivia" element={<TriviaGame />} />
        <Route path="/debate" element={<SimpleDebateGame />} />
        <Route path="/vote" element={<VotePage />} />
      </Routes>
    </Router>
  )
}

export default App
