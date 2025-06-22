import React, { useState, useEffect, useRef } from 'react';
import useGameWebSocket from '../hooks/useGameWebSocket';

const DebateGameView = ({ debateId, onBackToMenu, setupForm }) => {
  const [debateState, setDebateState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [debateFinished, setDebateFinished] = useState(false);
  const [judgment, setJudgment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  
  // WebSocket connection
  const { 
    isConnected, 
    lastMessage, 
    sendMessage 
  } = useGameWebSocket(`ws://localhost:8003/api/debate/ws/${debateId}`);

  // Audio refs for TTS playback
  const audioRef = useRef(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  // Load initial debate state
  useEffect(() => {
    const loadDebateState = async () => {
      try {
        const response = await fetch(`http://localhost:8003/api/debate/${debateId}/state`);
        if (response.ok) {
          const state = await response.json();
          setDebateState(state);
          setTranscript(state.transcript || []);
          setDebateFinished(state.is_finished);
          if (state.judgment) {
            setJudgment(state.judgment);
          }
        }
      } catch (err) {
        console.error('Failed to load debate state:', err);
        setError('Failed to load debate state');
      }
    };

    loadDebateState();
  }, [debateId]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const message = lastMessage;
      console.log('WebSocket message received:', message);

      switch (message.type) {
        case 'initial_state':
        case 'state_update':
          if (message.debate_state) {
            setDebateState(message.debate_state);
            setTranscript(message.debate_state.transcript || []);
            setDebateFinished(message.debate_state.is_finished);
            if (message.debate_state.judgment) {
              setJudgment(message.debate_state.judgment);
            }
          }
          break;
        
        case 'argument_generated':
          if (message.debate_state) {
            setDebateState(message.debate_state);
            setTranscript(message.debate_state.transcript || []);
            
            // Auto-play the new argument if audio URL is available
            if (message.audio_url) {
              playAudioUrl(message.audio_url, message.player);
            } else if (message.result?.argument) {
              // Use browser TTS as fallback
              speakText(message.result.argument, message.player);
            }
          }
          break;
        
        case 'debate_judged':
          if (message.judgment) {
            setJudgment(message.judgment);
            setDebateFinished(true);
          }
          break;
      }
    }
  }, [lastMessage]);

  // Generate argument for a player
  const generateArgument = async (player, opponentTranscript = '') => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8003/api/debate/${debateId}/argument`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player: player,
          opponent_transcript: opponentTranscript
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate argument: ${response.status}`);
      }

      const data = await response.json();
      console.log('Argument generated:', data);
      
    } catch (err) {
      console.error('Failed to generate argument:', err);
      setError(`Failed to generate argument: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance debate (generate arguments for both players)
  const autoAdvanceDebate = async () => {
    if (!debateState || debateFinished) return;
    
    setAutoAdvancing(true);
    try {
      const currentPlayer = debateState.next_player;
      const otherPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
      
      // Generate argument for current player
      await generateArgument(currentPlayer);
      
      // Wait a bit then check if we can continue
      setTimeout(async () => {
        if (!debateState.is_finished) {
          await generateArgument(otherPlayer);
        }
      }, 3000);
      
    } catch (err) {
      console.error('Auto advance failed:', err);
      setError('Auto advance failed');
    } finally {
      setAutoAdvancing(false);
    }
  };

  // Judge the debate
  const judgeDebate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8003/api/debate/${debateId}/judge`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to judge debate: ${response.status}`);
      }

      const data = await response.json();
      setJudgment(data.judgment);
      setDebateFinished(true);
      
    } catch (err) {
      console.error('Failed to judge debate:', err);
      setError(`Failed to judge debate: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Play audio from URL (Vapi)
  const playAudioUrl = (audioUrl, player) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(err => {
        console.log('Audio playback failed, using TTS fallback');
      });
      setCurrentlyPlaying(player);
    }
  };

  // Browser TTS fallback
  const speakText = (text, player) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice based on player
      const voices = speechSynthesis.getVoices();
      if (player === 'player1') {
        // Use male voice for player 1
        const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('male')) || voices[0];
        utterance.voice = maleVoice;
      } else {
        // Use female voice for player 2
        const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('female')) || voices[1];
        utterance.voice = femaleVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = player === 'player1' ? 0.8 : 1.2;
      
      utterance.onstart = () => setCurrentlyPlaying(player);
      utterance.onend = () => setCurrentlyPlaying(null);
      
      speechSynthesis.speak(utterance);
    }
  };

  // Replay audio for a specific transcript entry
  const replayArgument = (entry) => {
    if (entry.audio_url) {
      playAudioUrl(entry.audio_url, entry.player);
    } else {
      speakText(entry.argument, entry.player);
    }
  };

  if (!debateState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-pink-500/30 animate-ping mx-auto"></div>
          </div>
          <div className="text-3xl font-black text-white mb-2">Loading Debate</div>
          <div className="text-slate-400 text-lg">Setting up the arena...</div>
        </div>
      </div>
    );
  }

  const getPlayerInfo = (player) => {
    const isPlayer1 = player === 'player1';
    const model = isPlayer1 ? setupForm.player1Model : setupForm.player2Model;
    const position = debateState.positions?.[player] || 'UNKNOWN';
    const color = isPlayer1 ? 'blue' : 'red';
    
    return { model, position, color, isPlayer1 };
  };

  const getWinnerDisplay = () => {
    if (!judgment) return null;
    
    const winner = judgment.winner;
    if (winner === 'TIE') {
      return (
        <div className="text-center p-6 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-2xl border border-yellow-600/30">
          <div className="text-6xl mb-4">🤝</div>
          <div className="text-3xl font-bold text-yellow-400 mb-2">It's a Tie!</div>
          <div className="text-slate-300">{judgment.reasoning}</div>
        </div>
      );
    }
    
    // Find which player won
    let winnerPlayer = null;
    for (const [player, position] of Object.entries(debateState.positions)) {
      if (position === winner) {
        winnerPlayer = player;
        break;
      }
    }
    
    if (winnerPlayer) {
      const playerInfo = getPlayerInfo(winnerPlayer);
      return (
        <div className={`text-center p-6 bg-gradient-to-r from-${playerInfo.color}-900/50 to-${playerInfo.color}-800/50 rounded-2xl border border-${playerInfo.color}-600/30`}>
          <div className="text-6xl mb-4">🏆</div>
          <div className={`text-3xl font-bold text-${playerInfo.color}-400 mb-2`}>
            {playerInfo.model} Wins!
          </div>
          <div className="text-lg text-slate-300 mb-2">
            Position: {playerInfo.position}
          </div>
          <div className="text-slate-300">{judgment.reasoning}</div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
      {/* Hidden audio element for Vapi playback */}
      <audio ref={audioRef} onEnded={() => setCurrentlyPlaying(null)} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto p-6">
          <button 
            onClick={onBackToMenu}
            className="mb-6 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Setup
          </button>
          
          <div className="text-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-3">
              🎭 LIVE DEBATE
            </h1>
            <p className="text-2xl text-slate-300 mb-4 font-medium">
              {debateState.topic}
            </p>
            <div className="flex items-center justify-center gap-4 text-lg text-slate-400">
              <span>Round {debateState.current_round + 1} of {debateState.total_rounds}</span>
              <span>•</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? '🔗 Connected' : '❌ Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Winner Display */}
        {debateFinished && judgment && (
          <div className="mb-8">
            {getWinnerDisplay()}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-xl">
            <div className="text-red-400 font-medium">{error}</div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 flex justify-center gap-4">
          {!debateFinished && (
            <>
              <button
                onClick={() => generateArgument(debateState.next_player)}
                disabled={loading || autoAdvancing}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? '⏳ Generating...' : `🎤 Next Argument (${debateState.next_player})`}
              </button>
              
              <button
                onClick={autoAdvanceDebate}
                disabled={loading || autoAdvancing}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
              >
                {autoAdvancing ? '⏳ Auto Running...' : '🚀 Auto Advance'}
              </button>
            </>
          )}
          
          {debateFinished && !judgment && (
            <button
              onClick={judgeDebate}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? '⏳ Judging...' : '⚖️ Judge Debate'}
            </button>
          )}
        </div>

        {/* Debate Transcript */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl rounded-3xl border border-slate-600/30 shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-4xl">📜</span>
            Debate Transcript
          </h2>
          
          {transcript.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎭</div>
              <div className="text-2xl text-slate-400 mb-2">No arguments yet</div>
              <div className="text-slate-500">Click "Next Argument" to begin the debate</div>
            </div>
          ) : (
            <div className="space-y-6">
              {transcript.map((entry, index) => {
                const playerInfo = getPlayerInfo(entry.player);
                const isCurrentlyPlayingThis = currentlyPlaying === entry.player;
                
                return (
                  <div
                    key={index}
                    className={`p-6 rounded-2xl border transition-all duration-300 ${
                      playerInfo.isPlayer1
                        ? 'bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-blue-600/30'
                        : 'bg-gradient-to-r from-red-900/30 to-red-800/30 border-red-600/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${
                          playerInfo.isPlayer1
                            ? 'from-blue-600 to-cyan-600'
                            : 'from-red-600 to-pink-600'
                        } flex items-center justify-center text-white font-bold text-lg`}>
                          {playerInfo.isPlayer1 ? '1' : '2'}
                        </div>
                        <div>
                          <div className={`text-xl font-bold ${
                            playerInfo.isPlayer1 ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            {playerInfo.model}
                          </div>
                          <div className="text-slate-400 text-sm">
                            Position: {playerInfo.position} • Round {entry.round} • {entry.round_type}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => replayArgument(entry)}
                        disabled={isCurrentlyPlayingThis}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 disabled:bg-green-600/50 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
                      >
                        {isCurrentlyPlayingThis ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Playing
                          </>
                        ) : (
                          <>
                            🔊 Replay
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-white text-lg leading-relaxed">
                      {entry.argument}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebateGameView; 