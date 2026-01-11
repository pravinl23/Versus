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
      {/* FULL SCREEN BLACK OVERLAY */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
                      backgroundColor: 'black',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header with Skip Button */}
              <div className="flex items-center justify-between mb-4" style={{ flexShrink: 0 }}>
                <div className="flex items-center">
                  <Users className="mr-3" size={28} />
                  <h2 className="text-2xl font-bold text-white">Pre-Game Voting</h2>
                </div>
                <div className="flex items-center space-x-4">
                  {votingPhase === 'voting' && (
                    <>
                      <div className="flex items-center text-white bg-black border border-gray-600 px-4 py-2 rounded-full">
                        <Clock size={18} className="mr-2" />
                        <span className="font-mono text-xl font-bold">{timeLeft}</span>
                      </div>
                      <button
                        onClick={handleSkipDemo}
                        className="flex items-center px-4 py-2 bg-black border border-gray-600 hover:bg-gray-900 text-white rounded-full transition-colors"
                      >
                        <SkipForward size={16} className="mr-2" />
                        SKIP DEMO
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Phase Status */}
              <div className={`text-center mb-4 p-3 rounded-xl bg-black border-2 ${
                votingPhase === 'voting' ? 'border-green-500' : 
                votingPhase === 'completed' ? 'border-purple-500' : 'border-blue-500'
              }`} style={{ flexShrink: 0 }}>
                <p className={`font-bold text-lg ${phaseMessage.color}`}>
                  {phaseMessage.text}
                </p>
                {votingPhase === 'voting' && (
                  <p className="text-sm text-yellow-400 mt-2">
                    💡 Scan QR with phone • Vote multiple times!
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '40px', flex: 1, minHeight: 0, alignItems: 'center' }}>
                {/* QR Code on LEFT - only show during voting */}
                {votingPhase === 'voting' && (
                  <div style={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QRCodeVote gameId={gameId} size={300} />
                  </div>
                )}

                {/* Vote Results on RIGHT */}
                <div style={{ 
                  flex: votingPhase === 'voting' ? '0 0 50%' : '1', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  maxWidth: votingPhase === 'voting' ? 'none' : '600px',
                  margin: votingPhase === 'voting' ? '0' : '0 auto'
                }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Live Results</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-400">
                        {error ? 'Disconnected' : 'Connected'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
                    <VoteChart voteStats={voteStats} isLoading={isLoading} />
                  </div>
                  
                  <div className="mt-6 text-center">
                    <p className="text-lg text-gray-300">
                      Total Votes: <span className="font-bold text-white text-xl">{totalVotes}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact Instructions */}
              {votingPhase === 'voting' && (
                <div className="mt-4 text-center" style={{ flexShrink: 0 }}>
                  <p className="text-sm text-gray-400">
                    📱 Scan QR → 🤖 Choose Model → 📊 Watch Results → 🔄 Vote Again!
                  </p>
                </div>
              )}

              {/* Final Results */}
              {votingPhase === 'completed' && totalVotes > 0 && (
                <div className="mt-4 bg-black rounded-xl p-4 border-2 border-purple-500 text-center" style={{ flexShrink: 0 }}>
                  <h4 className="text-xl font-bold text-white mb-2">🏆 Final Results</h4>
                  <div className="text-center">
                    {voteStats.gpt_4o > voteStats.claude ? (
                      <p className="text-green-400 font-bold text-lg">GPT-4o Wins!</p>
                    ) : voteStats.claude > voteStats.gpt_4o ? (
                      <p className="text-blue-400 font-bold text-lg">Claude Wins!</p>
                    ) : (
                      <p className="text-yellow-400 font-bold text-lg">It's a Tie!</p>
                    )}
                    <p className="text-md text-gray-300 mt-2">
                      GPT-4o: <span className="font-bold">{voteStats.gpt_4o}</span> | Claude: <span className="font-bold">{voteStats.claude}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}
    </>
  );
};

export default SidebarVote; 