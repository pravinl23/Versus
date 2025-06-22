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
    "Artificial intelligence will create more jobs than it destroys",
    "Climate change is primarily caused by human activity",
    "Privacy is more important than security"
  ];

  const availableModels = [
    { value: 'OPENAI', label: 'GPT-4', icon: '🤖' },
    { value: 'ANTHROPIC', label: 'Claude 3 Haiku', icon: '🧠' },
    { value: 'GEMINI', label: 'Gemini Pro', icon: '💎' },
    { value: 'GROQ', label: 'Mixtral 8x7B', icon: '⚡' }
  ];

  const handleInputChange = (field, value) => {
    setSetupForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTopicSelect = (topic) => {
    setSetupForm(prev => ({
      ...prev,
      topic: topic
    }));
  };

  const handleStartDebate = async () => {
    if (!setupForm.topic.trim()) {
      setError('Please enter or select a debate topic');
      return;
    }

    if (setupForm.player1Model === setupForm.player2Model) {
      setError('Please select different models for Player 1 and Player 2');
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
          topic: setupForm.topic.trim(),
          total_rounds: setupForm.totalRounds
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDebateId(data.debate_id);
      setGameStarted(true);
      
    } catch (error) {
      console.error('Failed to start debate:', error);
      setError(`Failed to start debate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setDebateId(null);
    setError('');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🎭 Voice Debate Arena
          </h1>
          <p className="text-xl text-slate-300">
            Watch AI models engage in sophisticated spoken debates
          </p>
        </div>

        {/* Setup Form */}
        <div className="max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-6 text-center">Setup Your Debate</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Model Selection */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-3 text-slate-300">
                Player 1 Model
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableModels.map((model) => (
                  <button
                    key={`p1-${model.value}`}
                    onClick={() => handleInputChange('player1Model', model.value)}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      setupForm.player1Model === model.value
                        ? 'border-blue-500 bg-blue-900/50 text-blue-200'
                        : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl mb-1">{model.icon}</div>
                    <div className="text-sm font-medium">{model.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 text-slate-300">
                Player 2 Model
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableModels.map((model) => (
                  <button
                    key={`p2-${model.value}`}
                    onClick={() => handleInputChange('player2Model', model.value)}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      setupForm.player2Model === model.value
                        ? 'border-green-500 bg-green-900/50 text-green-200'
                        : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl mb-1">{model.icon}</div>
                    <div className="text-sm font-medium">{model.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-3 text-slate-300">
              Debate Topic
            </label>
            <div className="mb-4">
              <input
                type="text"
                value={setupForm.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                placeholder="Enter your debate topic or select from below..."
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:border-purple-500 focus:outline-none text-white placeholder-slate-400"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {predefinedTopics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleTopicSelect(topic)}
                  className={`p-3 text-left rounded-lg border transition-all duration-200 ${
                    setupForm.topic === topic
                      ? 'border-purple-500 bg-purple-900/50 text-purple-200'
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="text-sm">{topic}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rounds Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-3 text-slate-300">
              Total Rounds (each model speaks this many times)
            </label>
            <div className="flex gap-2">
              {[4, 6, 8, 10].map((rounds) => (
                <button
                  key={rounds}
                  onClick={() => handleInputChange('totalRounds', rounds)}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                    setupForm.totalRounds === rounds
                      ? 'border-yellow-500 bg-yellow-900/50 text-yellow-200'
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  {rounds} rounds
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={handleStartDebate}
              disabled={loading}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Starting Debate...
                </div>
              ) : (
                '🎤 Start Voice Debate'
              )}
            </button>
          </div>
        </div>

        {/* Features Info */}
        <div className="max-w-4xl mx-auto mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl mb-3">🎤</div>
            <h3 className="text-lg font-semibold mb-2">Voice-Powered</h3>
            <p className="text-sm text-slate-400">
              Arguments are spoken aloud using advanced text-to-speech technology
            </p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Real-Time</h3>
            <p className="text-sm text-slate-400">
              Watch the debate unfold live with instant responses and audio playback
            </p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold mb-2">Intelligent</h3>
            <p className="text-sm text-slate-400">
              AI models engage in sophisticated arguments with automatic judging
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebateGame; 