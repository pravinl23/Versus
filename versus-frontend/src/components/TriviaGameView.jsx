import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarVote from './SidebarVote'
import './TriviaGameView.css'

const TriviaGameView = ({ gameId, player1Model, player2Model, onGameEnd }) => {
  const navigate = useNavigate()
  
  console.log('TriviaGameView mounted with props:', { gameId, player1Model, player2Model })

  // Get display names and info for models
  const getModelInfo = (modelId) => {
    if (!modelId) return { name: 'Unknown', color: '#6b7280', emoji: '🤖' }
    
    const id = modelId.toLowerCase()
    
    // OpenAI models
    if (id.includes('gpt-4o')) return { name: 'GPT-4o', color: '#10a37f', emoji: '🤖' }
    if (id.includes('gpt-4-turbo')) return { name: 'GPT-4 Turbo', color: '#10a37f', emoji: '🤖' }
    if (id.includes('gpt-3.5')) return { name: 'GPT-3.5', color: '#10a37f', emoji: '🤖' }
    if (id.includes('gpt') || id.includes('openai')) return { name: 'GPT-4', color: '#10a37f', emoji: '🤖' }
    
    // Anthropic models
    if (id.includes('claude-3-opus')) return { name: 'Claude 3 Opus', color: '#d97706', emoji: '🧠' }
    if (id.includes('claude-3-sonnet')) return { name: 'Claude 3 Sonnet', color: '#d97706', emoji: '🧠' }
    if (id.includes('claude-3-haiku')) return { name: 'Claude 3 Haiku', color: '#d97706', emoji: '🧠' }
    if (id.includes('claude') || id.includes('anthropic')) return { name: 'Claude 3', color: '#d97706', emoji: '🧠' }
    
    // Google models
    if (id.includes('gemini-1.5-pro')) return { name: 'Gemini 1.5 Pro', color: '#4285f4', emoji: '✨' }
    if (id.includes('gemini-1.5-flash')) return { name: 'Gemini 1.5 Flash', color: '#4285f4', emoji: '✨' }
    if (id.includes('gemini')) return { name: 'Gemini Pro', color: '#4285f4', emoji: '✨' }
    
    // Groq/Other models
    if (id.includes('llama')) return { name: 'Llama 3', color: '#f59e0b', emoji: '🦙' }
    if (id.includes('mixtral')) return { name: 'Mixtral', color: '#f59e0b', emoji: '⚡' }
    if (id.includes('groq')) return { name: 'Groq', color: '#f59e0b', emoji: '⚡' }
    
    // Fallback - capitalize the model name
    return { 
      name: modelId.charAt(0).toUpperCase() + modelId.slice(1), 
      color: '#6b7280', 
      emoji: '🤖' 
    }
  }

  // Handle both object and string model formats
  const player1ModelId = typeof player1Model === 'string' ? player1Model : player1Model?.id
  const player2ModelId = typeof player2Model === 'string' ? player2Model : player2Model?.id
  
  const player1Info = getModelInfo(player1ModelId)
  const player2Info = getModelInfo(player2ModelId)

  // Race state for each player
  const [player1State, setPlayer1State] = useState({
    questionIndex: 0,
    score: 0,
    currentQuestion: null,
    isAnswering: false,
    finished: false,
    responses: []
  })
  
  const [player2State, setPlayer2State] = useState({
    questionIndex: 0,
    score: 0,
    currentQuestion: null,
    isAnswering: false,
    finished: false,
    responses: []
  })
  
  const [raceState, setRaceState] = useState({
    totalQuestions: 20,
    votingComplete: false,
    raceStarted: false,
    raceFinished: false,
    winner: null,
    raceTime: 0
  })
  
  const [websocket, setWebsocket] = useState(null)
  
  const wsRef = useRef(null)

  // Handle when voting period ends
  const handleGameStart = () => {
    console.log('🎮 Voting complete, starting race automatically...')
    setRaceState(prev => ({ ...prev, votingComplete: true, raceStarted: true }))
    
    // Start asking questions to both players immediately
    setTimeout(() => {
      askNextQuestion(1)
      askNextQuestion(2)
    }, 1000) // Small delay for UI transition
  }

  // WebSocket connection (only after voting is complete)
  useEffect(() => {
    if (gameId && raceState.votingComplete) {
      const ws = new WebSocket(`ws://localhost:8000/api/trivia/ws/${gameId}`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setWebsocket(ws)
        wsRef.current = ws
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        if (message.type === 'player_question_result') {
          handlePlayerQuestionResult(message.data)
        } else if (message.type === 'race_finished') {
          handleRaceFinished(message.data)
        } else if (message.type === 'post_game_interviews') {
          console.log('🔥 Received post-game roast data:', message.interviews)
          
          // Auto-play winner roast audio without modal
          if (message.interviews.winner && message.interviews.winner.audio_url) {
            console.log('🎵 Auto-playing trivia winner roast audio...')
            
            setTimeout(() => {
              // Ensure we have the full URL
              const audioUrl = message.interviews.winner.audio_url.startsWith('http') 
                ? message.interviews.winner.audio_url 
                : `http://localhost:8000${message.interviews.winner.audio_url}`
              
              console.log('🔊 Loading audio from:', audioUrl)
              const audio = new Audio(audioUrl)
              
              // Set volume
              audio.volume = 0.8
              
              audio.onplay = () => {
                console.log('▶️ 🔥 TRIVIA ROAST PLAYING:', message.interviews.winner.personality)
                console.log('💬 Roast:', message.interviews.winner.response || message.interviews.winner.text)
              }
              
              audio.onended = () => {
                console.log('✅ Trivia roast completed - savage!')
              }
              
              audio.onerror = (e) => {
                console.error('❌ Failed to play roast audio:', e)
                console.error('Audio URL was:', audioUrl)
              }
              
              // Auto-play the roast
              audio.play().catch(error => {
                console.error('❌ Audio autoplay failed (might need user interaction):', error)
                // Try playing on next user interaction
                const playOnInteraction = () => {
                  audio.play().catch(e => console.error('Still failed:', e))
                  document.removeEventListener('click', playOnInteraction)
                }
                document.addEventListener('click', playOnInteraction)
              })
              
            }, 2000) // Delay after race ends
          } else if (message.interviews.winner) {
            console.log('📝 Roast generated but no audio - text only:', message.interviews.winner.response)
          }
        } else if (message.type === 'error') {
          console.error('Game error:', message.message)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
      }
      
      return () => {
        if (ws) {
          ws.close()
        }
      }
    }
  }, [gameId, raceState.votingComplete])

  const handlePlayerQuestionResult = (result) => {
    const { player, question_number, response, correct, time } = result
    
    // Update the specific player's state
    if (player === 1) {
      setPlayer1State(prev => ({
        ...prev,
        questionIndex: question_number,
        score: prev.score + (correct ? 1 : 0),
        isAnswering: false,
        responses: [...prev.responses, result]
      }))
    } else {
      setPlayer2State(prev => ({
        ...prev,
        questionIndex: question_number,
        score: prev.score + (correct ? 1 : 0),
        isAnswering: false,
        responses: [...prev.responses, result]
      }))
    }
    
    // Continue the race for this player if they haven't finished
    setTimeout(() => {
      if (!raceState.raceFinished) {
        askNextQuestion(player)
      }
    }, 2000) // 2 second delay to show the result
  }

  const handleRaceFinished = (finalResults) => {
    setRaceState(prev => ({
      ...prev,
      raceFinished: true,
      winner: finalResults.race_winner,
      raceTime: finalResults.race_time
    }))
    
    // Mark both players as finished
    setPlayer1State(prev => ({ ...prev, finished: true, isAnswering: false }))
    setPlayer2State(prev => ({ ...prev, finished: true, isAnswering: false }))
  }

  const askNextQuestion = async (player) => {
    try {
      // First get the current question for this player
      const questionResponse = await fetch(`http://localhost:8000/api/trivia/game/${gameId}/player/${player}/current-question`)
      const questionData = await questionResponse.json()
      
      if (questionData.finished) {
        return // Player has finished all questions
      }
      
      // Update player state with current question
      if (player === 1) {
        setPlayer1State(prev => ({
          ...prev,
          currentQuestion: questionData.current_question,
          isAnswering: true
        }))
      } else {
        setPlayer2State(prev => ({
          ...prev,
          currentQuestion: questionData.current_question,
          isAnswering: true
        }))
      }
      
      // Ask the question to the model
      const response = await fetch(`http://localhost:8000/api/trivia/game/${gameId}/player/${player}/next-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get next question for player ${player}`)
      }
      
      // Result will come through WebSocket
    } catch (error) {
      console.error(`Error getting next question for player ${player}:`, error)
      
      // Mark player as not answering if there's an error
      if (player === 1) {
        setPlayer1State(prev => ({ ...prev, isAnswering: false }))
      } else {
        setPlayer2State(prev => ({ ...prev, isAnswering: false }))
      }
    }
  }

  // Show voting interface first
  if (!raceState.votingComplete) {
    console.log('Rendering voting interface - votingComplete:', raceState.votingComplete)
    return (
      <div className="trivia-game-container">
        <button
          onClick={() => navigate('/games')}
          className="back-button"
        >
          ← Back
        </button>
        
        <SidebarVote 
          gameId={gameId} 
          onGameStart={handleGameStart}
        />
        
        <div className="game-start-screen">
          <h1>🏁 TRIVIA RACE</h1>
          
          <div className="vs-setup">
            <div className="player-card">
              <div className="player-emoji">{player1Info.emoji}</div>
              <h3>{player1Info.name}</h3>
              <p>Player 1</p>
            </div>
            
            <div className="vs-divider">VS</div>
            
            <div className="player-card">
              <div className="player-emoji">{player2Info.emoji}</div>
              <h3>{player2Info.name}</h3>
              <p>Player 2</p>
            </div>
          </div>
          
          <div className="game-info">
            <p>🏁 RACE TO FINISH 20 QUESTIONS FIRST!</p>
            <p>Pre-game voting in progress...</p>
          </div>
        </div>
      </div>
    )
  }

  if (raceState.raceFinished) {
    return (
      <div className="trivia-game-container">
        <button
          onClick={() => navigate('/games')}
          className="back-button"
        >
          ← Back
        </button>
        
        <div className="game-over-screen">
          <h1>🏆 RACE FINISHED!</h1>
          
          <div className="final-scores">
            <div className={`final-score-card ${raceState.winner === 1 ? 'winner' : ''}`}>
              <div className="player-emoji">{player1Info.emoji}</div>
              <h3>{player1Info.name}</h3>
              <div className="score">{player1State.score}/20</div>
              <div className="questions-completed">{player1State.questionIndex} questions</div>
              {raceState.winner === 1 && <div className="winner-badge">WINNER!</div>}
            </div>
            
            <div className={`final-score-card ${raceState.winner === 2 ? 'winner' : ''}`}>
              <div className="player-emoji">{player2Info.emoji}</div>
              <h3>{player2Info.name}</h3>
              <div className="score">{player2State.score}/20</div>
              <div className="questions-completed">{player2State.questionIndex} questions</div>
              {raceState.winner === 2 && <div className="winner-badge">WINNER!</div>}
            </div>
          </div>
          
          <div className="race-time">
            Race completed in {raceState.raceTime.toFixed(1)} seconds
          </div>
          
          <button className="new-game-btn" onClick={onGameEnd}>
            NEW RACE
          </button>
        </div>

        {/* Audio auto-plays when roast is generated */}
      </div>
    )
  }

  // Race view - split screen
  return (
    <div className="trivia-race-container">
      <button
        onClick={() => navigate('/games')}
        className="back-button"
      >
        ← Back
      </button>
      
      {/* Race Header */}
      <div className="race-header">
        <h1>🏁 TRIVIA RACE</h1>
        <div className="race-status">
          {raceState.raceFinished ? 'RACE FINISHED!' : 'RACING...'}
        </div>
      </div>

      {/* Split Screen Race View */}
      <div className="race-split-view">
        {/* Player 1 Side */}
        <div className="player-race-side" style={{ borderColor: player1Info.color }}>
          <div className="player-header">
            <div className="player-info">
              <span className="player-emoji">{player1Info.emoji}</span>
              <h2>{player1Info.name}</h2>
            </div>
            <div className="player-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${(player1State.questionIndex / raceState.totalQuestions) * 100}%`,
                    backgroundColor: player1Info.color
                  }}
                />
              </div>
              <div className="progress-text">
                {player1State.questionIndex}/{raceState.totalQuestions} • Score: {player1State.score}
              </div>
            </div>
          </div>

          <div className="current-question-area">
            {player1State.isAnswering && (
              <div className="answering-state">
                <div className="spinner" />
                <p>Thinking...</p>
              </div>
            )}

            {player1State.currentQuestion && !player1State.isAnswering && (
              <div className="question-display">
                <h3>Q{player1State.questionIndex}: {player1State.currentQuestion.question}</h3>
                {player1State.currentQuestion.choices && (
                  <div className="choices">
                    {player1State.currentQuestion.choices.map((choice, index) => (
                      <div key={index} className="choice">
                        {String.fromCharCode(65 + index)}. {choice}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {player1State.finished && (
              <div className="finished-state">
                <h2>🏁 FINISHED!</h2>
                <p>Final Score: {player1State.score}/20</p>
              </div>
            )}
          </div>

          {/* Recent responses */}
          <div className="recent-responses">
            {player1State.responses.slice(-3).map((response, index) => (
              <div 
                key={index} 
                className={`mini-response ${response.correct ? 'correct' : 'incorrect'}`}
              >
                Q{response.question_number}: {response.correct ? '✅' : '❌'} ({response.time.toFixed(1)}s)
              </div>
            ))}
          </div>
        </div>

        {/* VS Divider */}
        <div className="vs-divider-race">
          <span>VS</span>
        </div>

        {/* Player 2 Side */}
        <div className="player-race-side" style={{ borderColor: player2Info.color }}>
          <div className="player-header">
            <div className="player-info">
              <span className="player-emoji">{player2Info.emoji}</span>
              <h2>{player2Info.name}</h2>
            </div>
            <div className="player-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${(player2State.questionIndex / raceState.totalQuestions) * 100}%`,
                    backgroundColor: player2Info.color
                  }}
                />
              </div>
              <div className="progress-text">
                {player2State.questionIndex}/{raceState.totalQuestions} • Score: {player2State.score}
              </div>
            </div>
          </div>

          <div className="current-question-area">
            {player2State.isAnswering && (
              <div className="answering-state">
                <div className="spinner" />
                <p>Thinking...</p>
              </div>
            )}

            {player2State.currentQuestion && !player2State.isAnswering && (
              <div className="question-display">
                <h3>Q{player2State.questionIndex}: {player2State.currentQuestion.question}</h3>
                {player2State.currentQuestion.choices && (
                  <div className="choices">
                    {player2State.currentQuestion.choices.map((choice, index) => (
                      <div key={index} className="choice">
                        {String.fromCharCode(65 + index)}. {choice}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {player2State.finished && (
              <div className="finished-state">
                <h2>🏁 FINISHED!</h2>
                <p>Final Score: {player2State.score}/20</p>
              </div>
            )}
          </div>

          {/* Recent responses */}
          <div className="recent-responses">
            {player2State.responses.slice(-3).map((response, index) => (
              <div 
                key={index} 
                className={`mini-response ${response.correct ? 'correct' : 'incorrect'}`}
              >
                Q{response.question_number}: {response.correct ? '✅' : '❌'} ({response.time.toFixed(1)}s)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audio auto-plays when roast is generated */}
    </div>
  )
}

export default TriviaGameView 