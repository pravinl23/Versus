import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Mic, Trophy, X } from 'lucide-react';

const PostGameInterview = ({ interviews, gameId, onClose }) => {
  const [currentInterview, setCurrentInterview] = useState('winner');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (interviews && Object.keys(interviews).length > 0) {
      console.log('🔥 PostGameInterview received data:', interviews);
      setIsVisible(true);
      // Auto-start with winner interview
      setCurrentInterview('winner');
      
      // Auto-play winner's roast immediately if audio is available
      if (interviews.winner) {
        console.log('🎯 Scheduling auto-play for winner roast...');
        
        // Try immediately first
        setTimeout(() => {
          console.log('🎵 Auto-playing winner roast');
          playInterview('winner');
        }, 500);
        
        // Fallback - try again after 2 seconds if first attempt fails
        setTimeout(() => {
          if (!isPlaying) {
            console.log('🔄 Retry auto-playing winner roast');
            playInterview('winner');
          }
        }, 2500);
      }
    }
  }, [interviews]);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const playInterview = (role) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const interview = interviews[role];
    if (!interview?.audio_url) {
      console.log(`❌ No audio URL for ${role} interview`);
      setCurrentInterview(role);
      return;
    }

    console.log(`🎵 Attempting to play audio: ${interview.audio_url}`);
    const audio = new Audio(interview.audio_url);
    
    audio.onplay = () => {
      console.log(`▶️ Audio started playing for ${role}`);
      setIsPlaying(true);
    };
    
    audio.onpause = () => {
      console.log(`⏸️ Audio paused for ${role}`);
      setIsPlaying(false);
    };
    
    audio.onended = () => {
      console.log(`✅ Audio playback completed for ${role}`);
      setIsPlaying(false);
      // Trash talk complete!
    };

    audio.onerror = (e) => {
      console.error(`❌ Audio error for ${role}:`, e);
      console.error(`❌ Failed to load audio from: ${interview.audio_url}`);
      setIsPlaying(false);
    };

    audio.onloadstart = () => {
      console.log(`📥 Started loading audio for ${role}`);
    };

    audio.oncanplay = () => {
      console.log(`✅ Audio ready to play for ${role}`);
    };

    audioRef.current = audio;
    setCurrentInterview(role);
    
    // Test if URL is accessible and immediately try to play
    fetch(interview.audio_url, { method: 'HEAD' })
      .then(response => {
        console.log(`🔍 Audio file check - Status: ${response.status}, Type: ${response.headers.get('content-type')}`);
        if (response.ok) {
          console.log(`✅ Audio file accessible, attempting play...`);
          audio.play().catch(error => {
            console.error(`❌ Failed to play audio:`, error);
          });
        } else {
          console.error(`❌ Audio file not accessible: ${response.status}`);
        }
      })
      .catch(error => {
        console.error(`❌ Error checking audio file:`, error);
        // Try to play anyway - sometimes CORS blocks HEAD but not GET
        console.log(`🔄 Trying to play audio despite check failure...`);
        audio.play().catch(playError => {
          console.error(`❌ Failed to play audio (fallback):`, playError);
        });
      });
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Allow fade out animation
    }
  };

  if (!interviews || Object.keys(interviews).length === 0 || !isVisible) {
    return null;
  }

  const currentData = interviews[currentInterview];
  const winnerData = interviews.winner;
  const loserData = interviews.loser;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900 to-blue-900">
          <div className="flex items-center space-x-3">
            <Mic className="text-yellow-400" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-white">🔥 WINNER'S TRASH TALK</h2>
              <p className="text-gray-300 text-sm">Pure roasting from the victorious AI</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Winner Header Bar */}
        {winnerData && (
          <div className="border-b border-gray-700 bg-gradient-to-r from-orange-600 to-red-600">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center space-x-3">
                <Trophy size={24} className="text-yellow-400" />
                <div className="text-white">
                  <div className="text-xl font-bold">{winnerData.personality}</div>
                  <div className="text-sm opacity-90">🔥 Ready to ROAST the competition!</div>
                </div>
                <Trophy size={24} className="text-yellow-400" />
              </div>
            </div>
          </div>
        )}

        {/* Interview Content */}
        {currentData && (
          <div className="p-6 space-y-6">
            {/* Winner Roast Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600">
                <div className="text-2xl">🔥</div>
                <div className="text-white">
                  <div className="text-xl font-bold">{currentData.personality}</div>
                  <div className="text-sm opacity-90">ROASTING {currentData.model}</div>
                </div>
                <div className="text-2xl">🔥</div>
              </div>
            </div>

            {/* Roast Question */}
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-orange-400">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-orange-400 font-semibold">🔥 Reporter:</span>
              </div>
              <p className="text-gray-200 italic">"{currentData.question}"</p>
            </div>

            {/* Trash Talk Response */}
            <div className="bg-gradient-to-r from-orange-900 to-red-900 rounded-lg p-6 border border-orange-500">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-orange-400 font-semibold">🔥 {currentData.personality} ROASTS:</span>
              </div>
              <p className="text-white text-lg leading-relaxed font-medium">
                "{currentData.response || currentData.text}"
              </p>
            </div>

            {/* Audio Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Volume2 className="text-gray-400" size={20} />
                  <span className="text-gray-300 text-sm">
                    Voice Style: <span className="text-blue-400 capitalize">{currentData.voice_style}</span>
                  </span>
                </div>
                
                {currentData.audio_url ? (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlayback}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      <span>{isPlaying ? 'Pause' : 'Play'} Roast</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        console.log(`🧪 Testing direct audio access: ${currentData.audio_url}`);
                        window.open(currentData.audio_url, '_blank');
                      }}
                      className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      🧪 Test URL
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    🔊 Audio not available - text only
                  </div>
                )}
              </div>

              {/* Audio Waveform Visualization */}
              {currentData.audio_url && (
                <div className="mt-4 bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-center h-12 space-x-1">
                    {/* Simple waveform animation */}
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-blue-400 rounded-full transition-all duration-150 ${
                          isPlaying ? 'animate-pulse' : 'opacity-50'
                        }`}
                        style={{
                          height: `${Math.random() * 30 + 10}px`,
                          animationDelay: `${i * 100}ms`
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-center text-gray-400 text-xs mt-2">
                    {isPlaying ? "🔥 Roasting in progress..." : "🔊 Click Play to hear the savage roast"}
                  </div>
                </div>
              )}
            </div>

            {/* Game Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <div className="text-gray-400 text-sm space-y-1">
                <div>🎮 Game ID: <span className="font-mono text-blue-400">{gameId}</span></div>
                <div>🔥 Powered by Letta AI Personalities & ElevenLabs Voice Synthesis</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostGameInterview; 