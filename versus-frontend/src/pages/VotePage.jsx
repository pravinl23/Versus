import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Vote, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { getBackendUrl } from '../utils/networkUtils';

const VotePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameId = searchParams.get('gameId');
  
  const [isVoting, setIsVoting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    // Check if gameId exists
    if (!gameId) {
      setError('Invalid game ID. Please scan the QR code again.');
    }
  }, [gameId]);

  const submitVote = async (model) => {
    if (!gameId) {
      setError('Invalid game ID');
      return;
    }

    setIsVoting(true);
    setSelectedModel(model);
    setError(null);

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: gameId,
          model: model
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit vote');
      }

      setVoteSubmitted(true);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        // Close the tab/window if possible
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          window.close();
        }
      }, 3000);

    } catch (err) {
      console.error('Error submitting vote:', err);
      setError(err.message || 'Failed to submit vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  if (!gameId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Link</h1>
          <p className="text-gray-300 mb-6">
            This voting link is invalid. Please scan the QR code from the game screen.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (voteSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Vote Submitted!</h1>
          <p className="text-gray-300 mb-2">
            Thanks for voting for <span className="font-semibold text-blue-400">{selectedModel}</span>!
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Your vote has been recorded. This page will close automatically.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">Game ID</p>
            <p className="font-mono text-sm text-blue-400">{gameId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Vote className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Vote Now!</h1>
          <p className="text-gray-300 mb-4">
            Which AI model do you think will win this game?
          </p>
          <div className="bg-gray-800 rounded-lg p-3 inline-block">
            <p className="text-xs text-gray-400 mb-1">Game ID</p>
            <p className="font-mono text-sm text-blue-400">{gameId}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Voting Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => submitVote('gpt-4o')}
            disabled={isVoting}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 ${
              isVoting
                ? 'bg-gray-800 border-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border-emerald-500 hover:border-emerald-400 transform hover:scale-105'
            }`}
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-emerald-600 font-bold text-sm">G</span>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white">GPT-4o</h3>
                <p className="text-emerald-200 text-sm">OpenAI's flagship model</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => submitVote('claude')}
            disabled={isVoting}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 ${
              isVoting
                ? 'bg-gray-800 border-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-500 hover:border-purple-400 transform hover:scale-105'
            }`}
          >
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">C</span>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white">Claude</h3>
                <p className="text-purple-200 text-sm">Anthropic's advanced AI</p>
              </div>
            </div>
          </button>
        </div>

        {/* Loading State */}
        {isVoting && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-gray-300 text-sm">Submitting your vote...</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by VERSUS • Real-time AI Battle Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default VotePage; 