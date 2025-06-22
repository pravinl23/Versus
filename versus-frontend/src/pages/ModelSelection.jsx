"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Shuffle, Users, Cpu, Lock } from "lucide-react"
import "./ModelSelection.css"

// Import company icons
import openaiIcon from "../assets/openai.png"
import claudeIcon from "../assets/claude.png"
import groqIcon from "../assets/groq.png"
import geminiIcon from "../assets/gemeni.png"

const AI_MODELS_DATA = [
  // OpenAI Models (Currently Available)
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "flagship", icon: openaiIcon },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", tier: "fast", icon: openaiIcon },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", tier: "balanced", icon: openaiIcon },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", tier: "fast", icon: openaiIcon },
  
  // Claude Models (Currently Available)
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic", tier: "flagship", icon: claudeIcon },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "Anthropic", tier: "fast", icon: claudeIcon },
  
  // Gemini Models (Currently Available)
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", tier: "balanced", icon: geminiIcon },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", tier: "fast", icon: geminiIcon },
  
  // Groq Models (Currently Available)
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "Groq", tier: "fast", icon: groqIcon },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", provider: "Groq", tier: "balanced", icon: groqIcon },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq", tier: "fast", icon: groqIcon },
  
  // Random option
  { id: "random", name: "RANDOM", provider: "???", tier: "special", isRandom: true },
]

const ModelCard = ({ model, onSelect, isSelectedP1, isSelectedP2, isHovered, onMouseEnter, onMouseLeave }) => {
  let borderClass = "border-slate-700"
  if (model.locked) {
    borderClass = "border-slate-800 opacity-50 cursor-not-allowed"
  } else if (isSelectedP1 && isSelectedP2) {
    borderClass = "border-yellow-400 ring-4 ring-yellow-400"
  } else if (isSelectedP1) {
    borderClass = "border-red-500 ring-4 ring-red-500"
  } else if (isSelectedP2) {
    borderClass = "border-blue-500 ring-4 ring-blue-500"
  } else if (isHovered && !model.locked) {
    borderClass = "border-slate-500 scale-105"
  }

  const handleClick = () => {
    if (!model.locked) {
      onSelect()
    }
  }

  return (
    <div
      className={`model-card ${borderClass} ${model.locked ? 'locked' : ''} ${isHovered && !model.locked ? 'hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Player tags */}
      <div className="player-tags-container">
        {isSelectedP1 && <div className="player-tag p1-tag">P1</div>}
        {isSelectedP2 && <div className="player-tag p2-tag">P2</div>}
      </div>

      {/* Model Icon/Image */}
      <div className="model-image-container">
        {model.isRandom ? (
          <Shuffle className="shuffle-icon" />
        ) : model.icon ? (
          <img src={model.icon} alt={model.provider} className="model-icon-normal" />
        ) : null}
      </div>

      {/* Model Name */}
      <div className="model-name-banner">
        <span className="model-name-text">{model.name}</span>
      </div>
    </div>
  )
}

const ModelSelection = () => {
  const navigate = useNavigate()
  const [player1Model, setPlayer1Model] = useState(null)
  const [player2Model, setPlayer2Model] = useState(null)
  const [hoveredModelId, setHoveredModelId] = useState(null)

  const handleModelSelect = (model) => {
    if (!player1Model) {
      setPlayer1Model(model)
    } else if (player1Model && !player2Model) {
      if (model.id === player1Model.id) {
        setPlayer2Model(model)
      } else {
        setPlayer2Model(model)
      }
    } else if (player1Model && player2Model) {
      // If P1 is re-selected, it changes P1's choice.
      // If P2 is re-selected, it changes P2's choice.
      // For simplicity, let's assume clicking again changes P1 if P2 is set, or P2 if P1 is set and P2 is not.
      // This logic can be refined based on exact Smash Bros. behavior (e.g., which player token is active)
      // For now, let's make it so that if both are selected, clicking changes P1.
      setPlayer1Model(model)
      // If the new P1 is the same as P2, clear P2 to avoid confusion or allow P2 to re-pick.
      if (player2Model && model.id === player2Model.id) {
        setPlayer2Model(null)
      }
    }
  }

  const handleReset = () => {
    setPlayer1Model(null)
    setPlayer2Model(null)
  }

  const handleProceed = () => {
    if (player1Model && player2Model) {
      // Handle random model selection
      let finalPlayer1 = player1Model;
      let finalPlayer2 = player2Model;
      
      // Get list of non-random models
      const availableModels = AI_MODELS_DATA.filter(m => !m.isRandom && !m.locked);
      
      if (player1Model.isRandom) {
        finalPlayer1 = availableModels[Math.floor(Math.random() * availableModels.length)];
      }
      
      if (player2Model.isRandom) {
        // Make sure we don't pick the same model if player1 was also random
        let remainingModels = availableModels;
        if (player1Model.isRandom && finalPlayer1) {
          remainingModels = availableModels.filter(m => m.id !== finalPlayer1.id);
        }
        finalPlayer2 = remainingModels[Math.floor(Math.random() * remainingModels.length)];
      }
      
      sessionStorage.setItem("player1Model", JSON.stringify(finalPlayer1))
      sessionStorage.setItem("player2Model", JSON.stringify(finalPlayer2))
      navigate("/games") // Navigate to your game selection or actual game page
    }
  }

  const getPlayerDisplayName = (playerModel) => {
    if (!playerModel) return "SELECT MODEL"
    if (playerModel.isRandom) return "RANDOM"
    return playerModel.name.toUpperCase()
  }

  return (
    <div className="smash-selection-container">
      <header className="smash-header">
        <button onClick={() => navigate("/")} className="smash-back-button">
          <ChevronLeft size={36} />
        </button>
        <div className="smash-title-container">
          <h1 className="smash-title-text">CHOOSE YOUR AI</h1>
        </div>
        <div className="smash-header-placeholder"></div> {/* For spacing */}
      </header>

      <main className="smash-grid-area">
        <div className="smash-models-grid">
          {AI_MODELS_DATA.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onSelect={() => handleModelSelect(model)}
              isSelectedP1={player1Model?.id === model.id}
              isSelectedP2={player2Model?.id === model.id}
              isHovered={hoveredModelId === model.id}
              onMouseEnter={() => setHoveredModelId(model.id)}
              onMouseLeave={() => setHoveredModelId(null)}
            />
          ))}
        </div>
      </main>

      <footer className="smash-footer">
        <div className="player-display player-one">
          <div className="player-info-card p1-card">
            <div className="player-tag-large p1-bg">P1</div>
            <div className="selected-model-name">{getPlayerDisplayName(player1Model)}</div>
            {player1Model && (
              <div className="selected-model-portrait">
                {player1Model.isRandom ? (
                  <Shuffle className="shuffle-icon" />
                ) : player1Model.icon ? (
                  <img src={player1Model.icon} alt={player1Model.provider} />
                ) : null}
              </div>
            )}
          </div>
        </div>
        <div className="vs-separator">
          <span className="vs-text">VS</span>
        </div>
        <div className="player-display player-two">
          <div className="player-info-card p2-card">
            <div className="player-tag-large p2-bg">P2</div>
            <div className="selected-model-name">{getPlayerDisplayName(player2Model)}</div>
            {player2Model && (
              <div className="selected-model-portrait">
                {player2Model.isRandom ? (
                  <Shuffle className="shuffle-icon" />
                ) : player2Model.icon ? (
                  <img src={player2Model.icon} alt={player2Model.provider} />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Actions Bar */}
      <div className="smash-actions-bar">
        <button className="smash-action-button reset-button" onClick={handleReset}>
          RESET
        </button>
        <button
          className="smash-action-button proceed-button"
          onClick={handleProceed}
          disabled={!player1Model || !player2Model}
        >
          START BATTLE
        </button>
      </div>
    </div>
  )
}

export default ModelSelection
