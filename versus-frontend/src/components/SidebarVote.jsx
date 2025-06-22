import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Vote } from 'lucide-react';
import QRCodeVote from './QRCodeVote';
import VoteChart from './VoteChart';
import { useVoteStats } from '../hooks/useVoteStats';

const SidebarVote = ({ gameId, gameName = 'Game', className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { voteStats, isLoading, error } = useVoteStats(gameId);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-700 transition-all duration-300 ease-in-out z-40 ${className}`}
        style={{ 
          width: isExpanded ? '380px' : '60px',
          transform: 'translateX(0)'
        }}
      >
        {/* Sidebar Content */}
        <div className="h-full overflow-y-auto">
          {/* Toggle Button - Always Visible */}
          <div className="p-3 border-b border-gray-700">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
              title={isExpanded ? 'Collapse voting panel' : 'Expand voting panel'}
            >
              {isExpanded ? (
                <div className="flex items-center space-x-2">
                  <ChevronRight size={20} />
                  <span className="text-sm">Close</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1">
                  <Vote size={20} />
                  <span className="text-xs">Vote</span>
                  {voteStats.total > 0 && (
                    <div className="bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {voteStats.total}
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Audience Poll</h2>
                <p className="text-sm text-gray-300">
                  Game ID: <span className="font-mono bg-gray-800 px-2 py-1 rounded text-blue-400">{gameId}</span>
                </p>
                {gameName && (
                  <p className="text-sm text-gray-400 mt-1">{gameName}</p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">Error: {error}</p>
                </div>
              )}

              {/* QR Code Section */}
              <div className="mb-8 text-center">
                <QRCodeVote gameId={gameId} />
              </div>

              {/* Vote Chart Section */}
              <div>
                <VoteChart 
                  voteStats={voteStats} 
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>


    </>
  );
};

export default SidebarVote; 