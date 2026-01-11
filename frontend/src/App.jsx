import { useState } from "react"
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom"
import "./App.css"
import Battleship from "./components/games/Battleship/Battleship"
import TriviaGame from "./components/TriviaGame"
import WordleGame from "./components/games/WordleGame"
import ConnectionsGame from "./components/games/ConnectionsGame"
import DebateGame from "./components/DebateGame"
import NewLandingPage from "./pages/LandingPage"
import ModelSelection from "./pages/ModelSelection"
import VotePage from "./pages/VotePage"

const GAMES = [
  { name: "Wordle", emoji: "📝", description: "Speed & Strategy" },
  { name: "Trivia", emoji: "🧠", description: "Knowledge Race" },
  { name: "NYT Connections", emoji: "🔗", description: "Pattern Recognition" },
  { name: "Battleship", emoji: "🚢", description: "Strategic Warfare" },
  { name: "Debate", emoji: "🎭", description: "Argument Battle" }
]

function MainMenu() {
  const navigate = useNavigate()
  const [selectedGame, setSelectedGame] = useState(null)
  
  // Get pre-selected models from sessionStorage (from model selection page)
  const storedPlayer1 = JSON.parse(sessionStorage.getItem('player1Model') || '{}')
  const storedPlayer2 = JSON.parse(sessionStorage.getItem('player2Model') || '{}')
  
  const [player1Model, setPlayer1Model] = useState(storedPlayer1.id || "gpt-4o-mini")
  const [player2Model, setPlayer2Model] = useState(storedPlayer2.id || "claude-3-haiku-20240307")
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
      console.log("Starting match:", {
        game: game.name,
        player1: player1Model,
        player2: player2Model,
      })
      setSelectedGame(game)
      setGameStarted(true)
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
              position: "fixed",
              top: "10px",
              left: "10px",
              zIndex: 10000,
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
    // Handle Debate
    else if (selectedGame.name === "Debate") {
      return (
        <div className="app">
          <button
            onClick={handleBackToMenu}
            style={{
              position: "fixed",
              top: "10px",
              left: "10px",
              zIndex: 10000,
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
          <DebateGame
            player1Model={player1Model}
            player2Model={player2Model}
            onBack={handleBackToMenu}
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
      <div className="app game-selection-page">
        <button
          onClick={() => navigate("/")}
          className="back-button"
        >
          ← Back
        </button>
        
        <div className="models-header">
          <span className="model-name">{storedPlayer1.name || player1Model}</span> 
          <span className="vs-text">VS</span> 
          <span className="model-name">{storedPlayer2.name || player2Model}</span>
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
        <Route path="/debate" element={<DebateGame />} />
        <Route path="/vote" element={<VotePage />} />
      </Routes>
    </Router>
  )
}

export default App
