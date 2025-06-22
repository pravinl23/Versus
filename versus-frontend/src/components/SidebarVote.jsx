import React, { useState, useEffect } from 'react';
import { X, Users, Clock, SkipForward } from 'lucide-react';
import QRCodeVote from './QRCodeVote';
import VoteChart from './VoteChart';
import { useVoteStats } from '../hooks/useVoteStats';

const SidebarVote = ({ gameId, onGameStart }) => {
  const [votingPhase, setVotingPhase] = useState('waiting'); // 'waiting', 'voting', 'completed'
  const [timeLeft, setTimeLeft] = useState(30);
  const [isVisible, setIsVisible] = useState(false);
  
  const { voteStats, isLoading, error } = useVoteStats(gameId);

  // Auto-start voting period when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setVotingPhase('voting');
      setIsVisible(true);
    }, 1000); // Small delay for smooth entrance

    return () => clearTimeout(timer);
  }, []);

  // Countdown timer during voting phase
  useEffect(() => {
    if (votingPhase !== 'voting') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setVotingPhase('completed');
          setTimeout(() => {
            setIsVisible(false);
            onGameStart?.(); // Notify parent that game can start
          }, 2000); // Show results for 2 seconds before closing
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [votingPhase, onGameStart]);

  // Handle skip demo
  const handleSkipDemo = () => {
    setVotingPhase('completed');
    setTimeout(() => {
      setIsVisible(false);
      onGameStart?.(); // Start game immediately
    }, 500);
  };

  const getPhaseMessage = () => {
    switch (votingPhase) {
      case 'waiting':
        return { text: "🎮 Game Loading...", color: "text-blue-400" };
      case 'voting':
        return { text: `⏰ Vote Now! ${timeLeft}s remaining`, color: "text-green-400" };
      case 'completed':
        return { text: "✅ Voting Complete! Starting game...", color: "text-purple-400" };
      default:
        return { text: "", color: "" };
    }
  };

  const totalVotes = voteStats.total || 0;
  const phaseMessage = getPhaseMessage();

  if (!isVisible && votingPhase === 'waiting') {
    return null; // Hidden until voting starts
  }

  return (
    <>
      {/* Full screen black backdrop */}
      {isVisible && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
          {/* Centered Modal */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header with Skip Button */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <Users className="mr-3" size={28} />
                  <h2 className="text-2xl font-bold text-white">Pre-Game Voting</h2>
                </div>
                <div className="flex items-center space-x-4">
                  {votingPhase === 'voting' && (
                    <>
                      <div className="flex items-center text-white bg-gray-800 px-4 py-2 rounded-full">
                        <Clock size={18} className="mr-2" />
                        <span className="font-mono text-xl font-bold">{timeLeft}</span>
                      </div>
                      <button
                        onClick={handleSkipDemo}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                      >
                        <SkipForward size={16} className="mr-2" />
                        SKIP DEMO
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Phase Status */}
              <div className={`text-center mb-8 p-4 rounded-xl bg-gray-800 border-2 ${
                votingPhase === 'voting' ? 'border-green-500' : 
                votingPhase === 'completed' ? 'border-purple-500' : 'border-blue-500'
              }`}>
                <p className={`font-bold text-lg ${phaseMessage.color}`}>
                  {phaseMessage.text}
                </p>
                {votingPhase === 'voting' && (
                  <div className="mt-2">
                    <p className="text-gray-300 mb-2">
                      Scan the QR code with your phone to vote!
                    </p>
                    <p className="text-sm text-yellow-400">
                      💡 You can vote multiple times - page refreshes after each vote
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* QR Code - only show during voting */}
                {votingPhase === 'voting' && (
                  <div className="text-center">
                    <QRCodeVote gameId={gameId} />
                  </div>
                )}

                {/* Vote Results */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Live Results</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-400">
                        {error ? 'Disconnected' : 'Connected'}
                      </span>
                    </div>
                  </div>
                  
                  <VoteChart voteStats={voteStats} isLoading={isLoading} />
                  
                  <div className="mt-6 text-center">
                    <p className="text-lg text-gray-300">
                      Total Votes: <span className="font-bold text-white text-xl">{totalVotes}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {votingPhase === 'voting' && (
                <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-600">
                  <h4 className="text-lg font-semibold text-white mb-4 text-center">How to Vote:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📱</div>
                      <p className="text-sm text-gray-300">1. Scan QR code with your phone</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">🤖</div>
                      <p className="text-sm text-gray-300">2. Choose GPT-4o or Claude</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <p className="text-sm text-gray-300">3. Watch live results update</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">🔄</div>
                      <p className="text-sm text-gray-300">4. Vote again after refresh!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Results */}
              {votingPhase === 'completed' && totalVotes > 0 && (
                <div className="mt-8 bg-purple-900 rounded-xl p-6 border-2 border-purple-500 text-center">
                  <h4 className="text-2xl font-bold text-white mb-4">
                    🏆 Final Results
                  </h4>
                  <div className="text-center">
                    {voteStats.gpt_4o > voteStats.claude ? (
                      <p className="text-green-400 font-bold text-xl">GPT-4o Wins!</p>
                    ) : voteStats.claude > voteStats.gpt_4o ? (
                      <p className="text-blue-400 font-bold text-xl">Claude Wins!</p>
                    ) : (
                      <p className="text-yellow-400 font-bold text-xl">It's a Tie!</p>
                    )}
                    <p className="text-lg text-gray-300 mt-3">
                      GPT-4o: <span className="font-bold">{voteStats.gpt_4o}</span> | Claude: <span className="font-bold">{voteStats.claude}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SidebarVote; 