import React, { useState, useEffect, useRef } from 'react'
import './TriviaGameView.css'

const TriviaGameView = ({ gameId, player1Model, player2Model, onGameEnd }) => {
  // Race state for each player
  const [player1State, setPlayer1State] = useState({
    questionIndex: 0,
    score: 0,
    currentQuestion: null,
    isAnswering: false,
    finished: false,
    responses: [],
    lastAnswer: null
  })
  
  const [player2State, setPlayer2State] = useState({
    questionIndex: 0,
    score: 0,
    currentQuestion: null,
    isAnswering: false,
    finished: false,
    responses: [],
    lastAnswer: null
  })
  
  const [raceState, setRaceState] = useState({
    totalQuestions: 20,
    raceStarted: false,
    raceFinished: false,
    winner: null,
    raceTime: 0
  })
  
  const [websocket, setWebsocket] = useState(null)
  const wsRef = useRef(null)
  const raceStartedRef = useRef(false)

  // WebSocket connection
  useEffect(() => {
    if (gameId && !raceStartedRef.current) {
      console.log('Connecting to WebSocket for game:', gameId)
      const ws = new WebSocket(`ws://localhost:8000/api/trivia/ws/${gameId}`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setWebsocket(ws)
        wsRef.current = ws
        
        // Auto-start the race after a short delay
        setTimeout(() => {
          if (!raceStartedRef.current) {
            raceStartedRef.current = true
            startRace()
          }
        }, 1500)
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        console.log('WebSocket message:', message)
        
        if (message.type === 'player_question_result') {
          handlePlayerQuestionResult(message.data)
        } else if (message.type === 'race_finished') {
          handleRaceFinished(message.data)
        } else if (message.type === 'error') {
          console.error('Game error:', message.message)
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
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
  }, [gameId])

  const handlePlayerQuestionResult = (result) => {
    const { player, question_number, response, correct, time, question } = result
    
    // Check if this is an error response
    const isError = response && response.startsWith('Error:') || response && response.includes('API Error');
    
    // Update the specific player's state
    if (player === 1) {
      setPlayer1State(prev => ({
        ...prev,
        questionIndex: question_number,
        score: prev.score + (correct && !isError ? 1 : 0),
        isAnswering: false,
        currentQuestion: null,
        lastAnswer: { response: response, correct: correct && !isError, question: question },
        responses: [...prev.responses, result]
      }))
    } else {
      setPlayer2State(prev => ({
        ...prev,
        questionIndex: question_number,
        score: prev.score + (correct && !isError ? 1 : 0),
        isAnswering: false,
        currentQuestion: null,
        lastAnswer: { response: response, correct: correct && !isError, question: question },
        responses: [...prev.responses, result]
      }))
    }
    
    // Continue the race for this player if they haven't finished
    setTimeout(() => {
      if (!raceState.raceFinished) {
        askNextQuestion(player)
      }
    }, 3000) // Show answer for 3 seconds
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

  const startRace = () => {
    console.log('Starting race...')
    setRaceState(prev => ({ ...prev, raceStarted: true }))
    
    // Start asking questions to both players
    askNextQuestion(1)
    askNextQuestion(2)
  }

  // Show countdown before race starts
  if (!raceState.raceStarted) {
    return (
      <div className="trivia-container">
        <div className="trivia-countdown">
          <h1>TRIVIA</h1>
          <div className="countdown-text">STARTING...</div>
        </div>
      </div>
    )
  }

  if (raceState.raceFinished) {
    return (
      <div className="trivia-container">
        <button 
          className="back-button"
          onClick={onGameEnd}
        >
          ← Back to Games
        </button>
        
        <div className="trivia-results">
          <h1>GAME OVER</h1>
          
          <div className="results-grid">
            <div className={`result-card ${raceState.winner === 1 ? 'winner' : ''}`}>
              <h2>{player1Model.name || player1Model.id}</h2>
              <div className="score">{player1State.score}/20</div>
              <div className="accuracy">
                {((player1State.score / 20) * 100).toFixed(0)}% ACCURACY
              </div>
              {raceState.winner === 1 && <div className="winner-label">WINNER</div>}
            </div>
            
            <div className="vs-divider">VS</div>
            
            <div className={`result-card ${raceState.winner === 2 ? 'winner' : ''}`}>
              <h2>{player2Model.name || player2Model.id}</h2>
              <div className="score">{player2State.score}/20</div>
              <div className="accuracy">
                {((player2State.score / 20) * 100).toFixed(0)}% ACCURACY
              </div>
              {raceState.winner === 2 && <div className="winner-label">WINNER</div>}
            </div>
          </div>
          
          <div className="race-time">
            COMPLETED IN {raceState.raceTime.toFixed(1)}s
          </div>
          
          <button className="play-again-button" onClick={onGameEnd}>
            PLAY AGAIN
          </button>
        </div>
      </div>
    )
  }

  // Main race view
  return (
    <div className="trivia-container">
      <button 
        className="back-button"
        onClick={onGameEnd}
      >
        ← Back to Games
      </button>

      {/* Header */}
      <div className="trivia-header">
        <h1>TRIVIA</h1>
        <div className="race-status">RACING...</div>
      </div>

      {/* Split Screen */}
      <div className="trivia-split">
        {/* Player 1 Side */}
        <div className="player-side">
          <div className="player-info">
            <h2>{player1Model.name || player1Model.id}</h2>
            <div className="provider">{player1Model.provider || 'AI'}</div>
          </div>

          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(player1State.questionIndex / raceState.totalQuestions) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              {player1State.questionIndex}/{raceState.totalQuestions} • SCORE: {player1State.score}
            </div>
          </div>

          <div className="question-area">
            {player1State.isAnswering && (
              <div className="thinking">
                <div className="thinking-text">THINKING...</div>
              </div>
            )}

            {player1State.currentQuestion && !player1State.isAnswering && (
              <div className="question-display">
                <div className="question-number">Q{player1State.questionIndex}</div>
                <div className="question-text">{player1State.currentQuestion.question}</div>
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

            {/* Show last answer after question is answered */}
            {player1State.lastAnswer && !player1State.isAnswering && !player1State.currentQuestion && (
              <div className="question-display">
                {player1State.lastAnswer.question && (
                  <>
                    <div className="question-number">Q{player1State.questionIndex}</div>
                    <div className="question-text">{player1State.lastAnswer.question.question}</div>
                    {player1State.lastAnswer.question.choices && (
                      <div className="choices">
                        {player1State.lastAnswer.question.choices.map((choice, index) => {
                          const letter = String.fromCharCode(65 + index);
                          const isSelected = 
                            player1State.lastAnswer.response === choice ||
                            player1State.lastAnswer.response === letter ||
                            player1State.lastAnswer.response === `${letter}. ${choice}`;
                          return (
                            <div 
                              key={index} 
                              className={`choice ${isSelected ? `selected ${player1State.lastAnswer.correct ? 'correct' : 'incorrect'}` : ''}`}
                            >
                              {letter}. {choice}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <div className="selected-answer-display">
                  <div className={`selected-answer ${player1State.lastAnswer.correct ? 'correct' : 'incorrect'}`}>
                    ANSWERED: {player1State.lastAnswer.response}
                    <br />
                    {player1State.lastAnswer.correct ? '✓ CORRECT!' : '✗ INCORRECT'}
                  </div>
                </div>
              </div>
            )}

            {player1State.finished && (
              <div className="finished">
                <h2>FINISHED!</h2>
                <p>FINAL SCORE: {player1State.score}/20</p>
              </div>
            )}
          </div>

          {/* Recent answers */}
          <div className="recent-answers">
            {player1State.responses.slice(-5).map((response, index) => (
              <div 
                key={index} 
                className={`answer-line ${response.correct ? 'correct' : 'incorrect'}`}
              >
                Q{response.question_number}: {response.correct ? '✓' : '✗'} ({response.time.toFixed(1)}s)
              </div>
            ))}
          </div>
        </div>

        {/* VS Divider */}
        <div className="vs-divider">
          <div className="vs-text">VS</div>
        </div>

        {/* Player 2 Side */}
        <div className="player-side">
          <div className="player-info">
            <h2>{player2Model.name || player2Model.id}</h2>
            <div className="provider">{player2Model.provider || 'AI'}</div>
          </div>

          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(player2State.questionIndex / raceState.totalQuestions) * 100}%` }}
              />
            </div>
            <div className="progress-text">
              {player2State.questionIndex}/{raceState.totalQuestions} • SCORE: {player2State.score}
            </div>
          </div>

          <div className="question-area">
            {player2State.isAnswering && (
              <div className="thinking">
                <div className="thinking-text">THINKING...</div>
              </div>
            )}

            {player2State.currentQuestion && !player2State.isAnswering && (
              <div className="question-display">
                <div className="question-number">Q{player2State.questionIndex}</div>
                <div className="question-text">{player2State.currentQuestion.question}</div>
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

            {/* Show last answer after question is answered */}
            {player2State.lastAnswer && !player2State.isAnswering && !player2State.currentQuestion && (
              <div className="question-display">
                {player2State.lastAnswer.question && (
                  <>
                    <div className="question-number">Q{player2State.questionIndex}</div>
                    <div className="question-text">{player2State.lastAnswer.question.question}</div>
                    {player2State.lastAnswer.question.choices && (
                      <div className="choices">
                        {player2State.lastAnswer.question.choices.map((choice, index) => {
                          const letter = String.fromCharCode(65 + index);
                          const isSelected = 
                            player2State.lastAnswer.response === choice ||
                            player2State.lastAnswer.response === letter ||
                            player2State.lastAnswer.response === `${letter}. ${choice}`;
                          return (
                            <div 
                              key={index} 
                              className={`choice ${isSelected ? `selected ${player2State.lastAnswer.correct ? 'correct' : 'incorrect'}` : ''}`}
                            >
                              {letter}. {choice}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <div className="selected-answer-display">
                  <div className={`selected-answer ${player2State.lastAnswer.correct ? 'correct' : 'incorrect'}`}>
                    ANSWERED: {player2State.lastAnswer.response}
                    <br />
                    {player2State.lastAnswer.correct ? '✓ CORRECT!' : '✗ INCORRECT'}
                  </div>
                </div>
              </div>
            )}

            {player2State.finished && (
              <div className="finished">
                <h2>FINISHED!</h2>
                <p>FINAL SCORE: {player2State.score}/20</p>
              </div>
            )}
          </div>

          {/* Recent answers */}
          <div className="recent-answers">
            {player2State.responses.slice(-5).map((response, index) => (
              <div 
                key={index} 
                className={`answer-line ${response.correct ? 'correct' : 'incorrect'}`}
              >
                Q{response.question_number}: {response.correct ? '✓' : '✗'} ({response.time.toFixed(1)}s)
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TriviaGameView 