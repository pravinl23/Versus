"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Shuffle, CheckCircle, XCircle, Users, Cpu } from "lucide-react"
import ModelIcon from "../components/ModelIcon"
import "./ModelSelection.css" // Make sure this path is correct

const AI_MODELS_DATA = [
  // Row 1
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "flagship", iconQuery: "futuristic brain gpt-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", tier: "flagship", iconQuery: "circuit brain gpt-4" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5", provider: "OpenAI", tier: "fast", iconQuery: "simple brain gpt-3.5" },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    tier: "flagship",
    iconQuery: "elegant brain claude opus",
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    tier: "balanced",
    iconQuery: "poetic brain claude sonnet",
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    tier: "fast",
    iconQuery: "minimalist brain claude haiku",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    tier: "flagship",
    iconQuery: "twin brain gemini pro",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    tier: "fast",
    iconQuery: "spark brain gemini flash",
  },

  // Row 2
  { id: "llama-3-70b", name: "Llama 3 70B", provider: "Meta", tier: "open", iconQuery: "llama face ai meta 70b" },
  { id: "llama-3-8b", name: "Llama 3 8B", provider: "Meta", tier: "open", iconQuery: "small llama face ai meta 8b" },
  {
    id: "mixtral-8x22b",
    name: "Mixtral 8x22B",
    provider: "Mistral",
    tier: "open",
    iconQuery: "wind brain mistral 8x22b",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    tier: "flagship",
    iconQuery: "strong wind brain mistral large",
  },
  {
    id: "command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    tier: "flagship",
    iconQuery: "commander brain cohere r plus",
  },
  { id: "command-r", name: "Command R", provider: "Cohere", tier: "balanced", iconQuery: "officer brain cohere r" },
  {
    id: "jamba-instruct",
    name: "Jamba Instruct",
    provider: "AI21",
    tier: "specialized",
    iconQuery: "musical brain ai21 jamba",
  },
  { id: "gemma-7b", name: "Gemma 7B", provider: "Google", tier: "open", iconQuery: "gemstone brain google gemma" },

  // Row 3
  {
    id: "phi-3-medium",
    name: "Phi-3 Medium",
    provider: "Microsoft",
    tier: "balanced",
    iconQuery: "phi symbol brain microsoft medium",
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini",
    provider: "Microsoft",
    tier: "fast",
    iconQuery: "small phi symbol brain microsoft mini",
  },
  {
    id: "qwen1.5-72b-chat",
    name: "Qwen1.5 72B",
    provider: "Alibaba",
    tier: "open",
    iconQuery: "dragon brain alibaba qwen 72b",
  },
  { id: "yi-34b-chat", name: "Yi 34B Chat", provider: "01.AI", tier: "open", iconQuery: "number one brain 01.ai yi" },
  {
    id: "deepseek-coder-33b",
    name: "DS Coder 33B",
    provider: "DeepSeek",
    tier: "specialized",
    iconQuery: "code brain deepseek coder",
  },
  {
    id: "wizardlm-2-8x22b",
    name: "WizardLM 2",
    provider: "Microsoft",
    tier: "open",
    iconQuery: "wizard hat brain microsoft wizardlm",
  },
  { id: "grok-1", name: "Grok-1", provider: "xAI", tier: "flagship", iconQuery: "cosmic brain xai grok" },
  {
    id: "dbrx-instruct",
    name: "DBRX Instruct",
    provider: "Databricks",
    tier: "open",
    iconQuery: "data bricks brain databricks dbrx",
  },
  { id: "random", name: "RANDOM", provider: "???", tier: "special", isRandom: true, iconQuery: "question mark random" },
]

const ModelCard = ({ model, onSelect, isSelectedP1, isSelectedP2, isHovered, onMouseEnter, onMouseLeave }) => {
  let borderClass = "border-slate-700"
  if (isSelectedP1 && isSelectedP2) {
    borderClass = "border-yellow-400 ring-4 ring-yellow-400"
  } else if (isSelectedP1) {
    borderClass = "border-red-500 ring-4 ring-red-500"
  } else if (isSelectedP2) {
    borderClass = "border-blue-500 ring-4 ring-blue-500"
  } else if (isHovered) {
    borderClass = "border-slate-500 scale-105"
  }

  return (
    <div
      className={`model-card ${borderClass} ${isHovered ? "hovered" : ""}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="model-image-container">
        {model.isRandom ? (
          <Shuffle className="h-16 w-16 text-yellow-400" />
        ) : (
          <ModelIcon model={model} size="normal" />
        )}
      </div>
      <div className="model-name-banner">
        <span className="model-name-text">{model.name}</span>
      </div>
      {(isSelectedP1 || isSelectedP2) && (
        <div className="player-tags-container">
          {isSelectedP1 && <div className="player-tag p1-tag">P1</div>}
          {isSelectedP2 && <div className="player-tag p2-tag">P2</div>}
        </div>
      )}
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
      sessionStorage.setItem("player1Model", JSON.stringify(player1Model))
      sessionStorage.setItem("player2Model", JSON.stringify(player2Model))
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
            {player1Model && !player1Model.isRandom && (
              <div className="selected-model-portrait">
                <ModelIcon model={player1Model} size="large" />
              </div>
            )}
            {player1Model && player1Model.isRandom && <Shuffle className="h-24 w-24 text-slate-300 my-auto" />}
            {!player1Model && <Users className="h-24 w-24 text-slate-500 my-auto" />}
          </div>
        </div>

        <div className="vs-separator">VS</div>

        <div className="player-display player-two">
          <div className="player-info-card p2-card">
            <div className="player-tag-large p2-bg">P2</div>
            <div className="selected-model-name">{getPlayerDisplayName(player2Model)}</div>
            {player2Model && !player2Model.isRandom && (
              <div className="selected-model-portrait">
                <ModelIcon model={player2Model} size="large" />
              </div>
            )}
            {player2Model && player2Model.isRandom && <Shuffle className="h-24 w-24 text-slate-300 my-auto" />}
            {!player2Model && <Cpu className="h-24 w-24 text-slate-500 my-auto" />}
          </div>
        </div>
      </footer>

      <div className="smash-actions-bar">
        <button onClick={handleReset} className="smash-action-button reset-button">
          <XCircle size={20} className="mr-2" /> RESET
        </button>
        <button
          onClick={handleProceed}
          disabled={!player1Model || !player2Model}
          className="smash-action-button proceed-button"
        >
          START BATTLE <CheckCircle size={20} className="ml-2" />
        </button>
      </div>
    </div>
  )
}

export default ModelSelection
