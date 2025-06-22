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
  const transcriptEndRef = useRef(null);

  // Model info mapping
  const getModelInfo = (modelType) => {
    const models = {
      'OPENAI': { name: 'GPT-4', icon: '🤖', color: 'blue' },
      'ANTHROPIC': { name: 'Claude 3 Haiku', icon: '🧠', color: 'green' },
      'GEMINI': { name: 'Gemini Pro', icon: '💎', color: 'purple' },
      'GROQ': { name: 'Mixtral 8x7B', icon: '⚡', color: 'yellow' }
    };
    return models[modelType] || { name: modelType, icon: '🤖', color: 'gray' };
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const message = JSON.parse(lastMessage.data);
      
      switch (message.type) {
        case 'current_state':
          setDebateState(message.state);
          setTranscript(message.transcript || []);
          break;
          
        case 'round_completed':
          setTranscript(prev => [...prev, message.round_data]);
          setDebateState(message.debate_state);
          
          // Play audio if available
          if (message.round_data.text && message.round_data.use_browser_tts) {
            speakText(message.round_data.text);
          }
          break;
          
        case 'debate_finished':
          setDebateFinished(true);
          setJudgment(message.judgment);
          setAutoAdvancing(false);
          break;
      }
    }
  }, [lastMessage]);

  // Browser-based text-to-speech
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // Advance to next round
  const handleNextRound = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:8003/api/debate/${debateId}/next-round`, {
        method: 'POST'
      });
    } catch (error) {
      setError(`Failed to advance round: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance through entire debate
  const handleAutoAdvance = async () => {
    setAutoAdvancing(true);
    try {
      await fetch(`http://localhost:8003/api/debate/${debateId}/auto-advance`, {
        method: 'POST'
      });
    } catch (error) {
      setError(`Auto-advance failed: ${error.message}`);
      setAutoAdvancing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Connecting to debate arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBackToMenu}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            ← Back to Setup
          </button>
          
          <h1 className="text-2xl font-bold">🎭 Voice Debate Arena</h1>
          
          <div className={`px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
          }`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Debate Controls */}
        {!debateFinished && debateState && (
          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                Round {debateState.current_round + 1} of {debateState.total_rounds}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleNextRound}
                  disabled={loading || autoAdvancing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    loading || autoAdvancing
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {loading ? 'Advancing...' : 'Next Round'}
                </button>
                
                <button
                  onClick={handleAutoAdvance}
                  disabled={loading || autoAdvancing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    autoAdvancing
                      ? 'bg-yellow-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {autoAdvancing ? '⏳ Auto-Running...' : '⚡ Auto-Advance'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Players Info */}
        {debateState && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{getModelInfo(setupForm.player1Model).icon}</div>
                <div>
                  <div className="font-semibold">{getModelInfo(setupForm.player1Model).name}</div>
                  <div className="text-sm text-blue-200">
                    Position: {debateState.player1_position}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-900/30 rounded-xl p-4 border border-green-700">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{getModelInfo(setupForm.player2Model).icon}</div>
                <div>
                  <div className="font-semibold">{getModelInfo(setupForm.player2Model).name}</div>
                  <div className="text-sm text-green-200">
                    Position: {debateState.player2_position}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">📝 Debate Transcript</h2>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {transcript.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                Debate transcript will appear here...
              </div>
            ) : (
              transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    entry.speaker === 1
                      ? 'bg-blue-900/20 border-blue-500'
                      : 'bg-green-900/20 border-green-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      {entry.speaker === 1 ? getModelInfo(setupForm.player1Model).name : getModelInfo(setupForm.player2Model).name}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      entry.position === 'PRO' ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'
                    }`}>
                      {entry.position}
                    </span>
                  </div>
                  
                  <p className="text-slate-200">{entry.text}</p>
                  
                  <button
                    onClick={() => speakText(entry.text)}
                    className="mt-2 text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    🔊 Play Audio
                  </button>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Final Judgment */}
        {debateFinished && judgment && (
          <div className="mt-6 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-xl p-6 border border-yellow-700">
            <h2 className="text-2xl font-semibold mb-4">🏆 Final Judgment</h2>
            
            {judgment.winner ? (
              <div className="text-center mb-4">
                <div className="text-xl font-bold mb-2">
                  Winner: {judgment.winner === 1 ? getModelInfo(setupForm.player1Model).name : getModelInfo(setupForm.player2Model).name}
                </div>
                <div className="text-lg text-yellow-200">
                  Position: {judgment.winner_position}
                </div>
              </div>
            ) : (
              <div className="text-center mb-4">
                <div className="text-xl font-bold">Draw / Inconclusive</div>
              </div>
            )}
            
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Judge's Reasoning:</h3>
              <p className="text-slate-200">{judgment.reasoning}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateGameView; 