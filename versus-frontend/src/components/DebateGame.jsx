import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DebateGameView from './DebateGameView';

const DebateGame = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [debateId, setDebateId] = useState(null);
  const [setupForm, setSetupForm] = useState({
    player1Model: 'OPENAI',
    player2Model: 'ANTHROPIC',
    topic: '',
    totalRounds: 6
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const predefinedTopics = [
    "AI should be regulated by government",
    "Social media does more harm than good",
    "Remote work is better than office work",
    "Nuclear energy is the future of clean power",
    "Universal basic income should be implemented",
    "Space exploration is worth the investment",
    "Cryptocurrency will replace traditional currency",
    "Human genetic modification should be allowed",
    "Renewable energy can replace fossil fuels completely",
    "Artificial intelligence will eliminate more jobs than it creates"
  ];

  const models = [
    { id: 'OPENAI', name: 'GPT-4', emoji: '🧠' },
    { id: 'ANTHROPIC', name: 'Claude 3', emoji: '🤖' },
    { id: 'GEMINI', name: 'Gemini Pro', emoji: '⭐' },
    { id: 'GROQ', name: 'Mixtral', emoji: '⚡' }
  ];

  const handleStartDebate = async () => {
    if (!setupForm.topic || !setupForm.player1Model || !setupForm.player2Model) {
      setError('Please fill in all fields');
      return;
    }

    if (setupForm.player1Model === setupForm.player2Model) {
      setError('Please select different models for each player');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8003/api/debate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player1_model: setupForm.player1Model,
          player2_model: setupForm.player2Model,
          topic: setupForm.topic,
          total_rounds: setupForm.totalRounds
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start debate: ${response.status}`);
      }

      const data = await response.json();
      console.log('Debate started:', data);
      
      setDebateId(data.debate_id);
      setGameStarted(true);
      
    } catch (err) {
      console.error('Failed to start debate:', err);
      setError(`Failed to start debate: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setDebateId(null);
    setError('');
  };

  const handleBackToGames = () => {
    navigate('/');
  };

  if (gameStarted && debateId) {
    return (
      <DebateGameView 
        debateId={debateId}
        onBackToMenu={handleBackToMenu}
        setupForm={setupForm}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-4xl mx-auto p-6">
          <button 
            onClick={handleBackToGames}
            className="mb-6 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Games
          </button>
          
          <div className="text-center">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-3">
              🎭 AI DEBATE ARENA
            </h1>
            <p className="text-2xl text-slate-300 mb-6 font-medium">
              Voice-Powered AI Arguments
            </p>
          </div>
        </div>
      </div>

      {/* Setup Form */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-xl rounded-3xl border border-slate-600/30 shadow-2xl p-8">
          
          {/* Topic Selection */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-4xl">💭</span>
              Choose Debate Topic
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {predefinedTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => setSetupForm({...setupForm, topic})}
                  className={`p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-105 ${
                    setupForm.topic === topic
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <div className="font-medium">{topic}</div>
                </button>
              ))}
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Or enter your own topic..."
                value={setupForm.topic}
                onChange={(e) => setSetupForm({...setupForm, topic: e.target.value})}
                className="w-full px-6 py-4 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-4xl">🤖</span>
              Select AI Debaters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Player 1 */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Debater 1
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSetupForm({...setupForm, player1Model: model.id})}
                      className={`p-4 rounded-xl text-center transition-all duration-300 transform hover:scale-105 ${
                        setupForm.player1Model === model.id
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">{model.emoji}</div>
                      <div className="font-medium">{model.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* VS */}
              <div className="flex items-center justify-center">
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                  VS
                </div>
              </div>

              {/* Player 2 */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Debater 2
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSetupForm({...setupForm, player2Model: model.id})}
                      className={`p-4 rounded-xl text-center transition-all duration-300 transform hover:scale-105 ${
                        setupForm.player2Model === model.id
                          ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">{model.emoji}</div>
                      <div className="font-medium">{model.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rounds Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-2xl">🔄</span>
              Number of Rounds
            </h2>
            <select
              value={setupForm.totalRounds}
              onChange={(e) => setSetupForm({...setupForm, totalRounds: parseInt(e.target.value)})}
              className="px-6 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            >
              <option value={4}>4 Rounds (Quick)</option>
              <option value={6}>6 Rounds (Standard)</option>
              <option value={8}>8 Rounds (Extended)</option>
              <option value={10}>10 Rounds (Full Debate)</option>
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-xl">
              <div className="text-red-400 font-medium">{error}</div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStartDebate}
            disabled={loading || !setupForm.topic || !setupForm.player1Model || !setupForm.player2Model}
            className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold text-xl rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                Starting Debate...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">🎙️</span>
                START VOICE DEBATE
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebateGame; 