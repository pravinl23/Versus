import React, { useState, useEffect, useRef } from 'react';
import SidebarVote from './SidebarVote';
import GameTimer from './common/GameTimer';
import Vapi from '@vapi-ai/web';
import './DebateGame.css';

const JUDGE_MODEL = 'gpt-4o'; // Hardcoded judge model

const DebateGame = ({ player1Model, player2Model, onBack }) => {
  const [gameId, setGameId] = useState('');
  const [gameStatus, setGameStatus] = useState('setup'); // setup, in_progress, finished
  const [topic, setTopic] = useState('');
  const [showTopicModal, setShowTopicModal] = useState(true);
  const [debateArgs, setDebateArgs] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [judgment, setJudgment] = useState(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  
  // Vapi-related state
  const [vapiInstance, setVapiInstance] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlyTyping, setCurrentlyTyping] = useState(null);

  // Get display names for models
  const getDisplayName = (modelId) => {
    if (!modelId) return 'Unknown';
    const modelStr = modelId.toString();
    
    // OpenAI models
    if (modelStr.includes('gpt-4o-mini')) return 'GPT-4o Mini';
    if (modelStr.includes('gpt-4o')) return 'GPT-4o';
    if (modelStr.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
    if (modelStr.includes('gpt-3.5')) return 'GPT-3.5 Turbo';
    
    // Claude models
    if (modelStr.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
    if (modelStr.includes('claude-3-haiku')) return 'Claude 3 Haiku';
    
    // Gemini models
    if (modelStr.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
    if (modelStr.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
    
    // Groq models
    if (modelStr.includes('mixtral')) return 'Mixtral 8x7B';
    if (modelStr.includes('llama-3.1-70b')) return 'Llama 3.1 70B';
    if (modelStr.includes('llama-3.1-8b')) return 'Llama 3.1 8B';
    
    return modelStr.charAt(0).toUpperCase() + modelStr.slice(1);
  };

  const player1DisplayName = getDisplayName(player1Model);
  const player2DisplayName = getDisplayName(player2Model);

  // Start the debate
  const startDebate = () => {
    if (!topic.trim()) {
      alert('Please enter a debate topic!');
      return;
    }

    const newGameId = `debate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setGameId(newGameId);
    setShowTopicModal(false);
    setGameStatus('in_progress');
    setMessage('Connecting to debate server...');
    
    // Connect to WebSocket
    connectWebSocket(newGameId);
  };

  const connectWebSocket = (gameId) => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/games/debate/${gameId}`);
      
      ws.onopen = () => {
        console.log('Connected to Debate WebSocket');
        setIsConnected(true);
        setMessage('Starting debate...');
        
        // Send start message with topic and models
        ws.send(JSON.stringify({
          type: 'start_debate',
          topic: topic,
          player1Model: player1Model,
          player2Model: player2Model,
          judgeModel: JUDGE_MODEL
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleGameStateUpdate(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setMessage('Connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setMessage('Failed to connect to server');
    }
  };

  // Typewriter effect - shows characters as they're spoken
  const startTypewriterEffect = (fullText, position) => {
    const chars = fullText.split('');
    const speechRate = 0.95; // Match speech rate
    const charsPerSecond = 15; // Average speaking speed in characters
    const msPerChar = 1000 / charsPerSecond;
    
    setCurrentlyTyping({ text: '', position, fullText });
    
    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < chars.length) {
        const displayText = chars.slice(0, charIndex + 1).join('');
        setCurrentlyTyping({ text: displayText, position, fullText });
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setCurrentlyTyping(null);
      }
    }, msPerChar);
    
    return () => clearInterval(typeInterval);
  };

  // Speak argument using Vapi
  const speakArgument = async (text, position) => {
    console.log(`🎤 Speaking ${position} argument:`, text);
    
    // Store speech promise to prevent overlapping
    if (window.currentSpeechPromise) {
      console.log('⏳ Waiting for previous speech to complete...');
      await window.currentSpeechPromise;
    }
    
    // Create new speech promise
    const speechPromise = new Promise(async (resolve) => {
      // Use Vapi if available
      if (vapiInstance) {
        try {
          // Stop any existing call
          try {
            vapiInstance.stop();
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (e) {
            // Ignore if no active call
          }

          // Vapi configuration with more natural settings
          const assistant = {
            voice: {
              provider: "11labs",
              voiceId: position === "PRO" ? "ErXwobaYiN019PkySvjV" : "EXAVITQu4vr4xnSDxMaL", // Antoni for PRO, Bella for CON
              model: "eleven_turbo_v2",
              speed: 0.95, // Slightly slower for more natural speech
              stability: 0.5, // More variation for natural sound
              similarityBoost: 0.75,
              style: 0.4, // More expressive
              useSpeakerBoost: true
            },
            model: {
              provider: "openai",
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are a debate assistant. Just repeat exactly what you're told."
                }
              ]
            },
            firstMessage: text,
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "en-US"
            }
          };

          console.log(`🎭 ${position} using Vapi voice: ${position === "PRO" ? "Antoni" : "Bella"}`);

          let cleanupTypewriter = null;
          let speechCompleted = false;

          const handleSpeechStart = () => {
            console.log('🗣️ Vapi started speaking');
            setIsSpeaking(true);
            cleanupTypewriter = startTypewriterEffect(text, position);
          };

          const handleSpeechEnd = () => {
            console.log('🗣️ Vapi finished speaking');
            setIsSpeaking(false);
            if (cleanupTypewriter) cleanupTypewriter();
            setCurrentlyTyping(null);
            speechCompleted = true;
            
            // Clean up listeners
            vapiInstance.off('speech-start', handleSpeechStart);
            vapiInstance.off('speech-end', handleSpeechEnd);
            vapiInstance.off('call-end', handleCallEnd);
            
            resolve();
          };
          
          const handleCallEnd = () => {
            if (!speechCompleted) {
              handleSpeechEnd();
            }
          };

          // Add event listeners
          vapiInstance.on('speech-start', handleSpeechStart);
          vapiInstance.on('speech-end', handleSpeechEnd);
          vapiInstance.on('call-end', handleCallEnd);

          // Start the call
          await vapiInstance.start(assistant);
          
          // Add timeout to ensure we don't wait forever
          setTimeout(() => {
            if (!speechCompleted) {
              console.log('⏱️ Speech timeout, moving on...');
              handleSpeechEnd();
            }
          }, 15000); // 15 second timeout
          
        } catch (error) {
          console.error('❌ Vapi TTS failed:', error);
          setIsSpeaking(false);
          setCurrentlyTyping(null);
          resolve();
        }
      } else {
        // Fallback: Use Web Speech API
        try {
          console.log('🔄 Using Web Speech API');
          
          window.speechSynthesis.cancel();
          await new Promise(r => setTimeout(r, 100));
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9; // Slower for more natural speech
          utterance.volume = 1.0;
          
          const voices = window.speechSynthesis.getVoices();
          
          if (position === "PRO") {
            const maleVoice = voices.find(voice => 
              voice.name.includes('Daniel') ||
              voice.name.includes('David') ||
              voice.name.includes('James') ||
              voice.name.includes('Male')
            ) || voices.find(voice => voice.lang.startsWith('en') && !voice.name.includes('Female'));
            
            if (maleVoice) utterance.voice = maleVoice;
            utterance.pitch = 0.85;
          } else {
            const femaleVoice = voices.find(voice => 
              voice.name.includes('Samantha') ||
              voice.name.includes('Victoria') ||
              voice.name.includes('Kate') ||
              voice.name.includes('Female')
            ) || voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Female'));
            
            if (femaleVoice) utterance.voice = femaleVoice;
            utterance.pitch = 1.1;
          }
          
          let cleanupTypewriter = null;
          
          utterance.onstart = () => {
            setIsSpeaking(true);
            cleanupTypewriter = startTypewriterEffect(text, position);
          };
          
          utterance.onend = () => {
            setIsSpeaking(false);
            if (cleanupTypewriter) cleanupTypewriter();
            setCurrentlyTyping(null);
            resolve();
          };
          
          utterance.onerror = (e) => {
            console.error('❌ Web Speech error:', e);
            setIsSpeaking(false);
            if (cleanupTypewriter) cleanupTypewriter();
            setCurrentlyTyping(null);
            resolve();
          };
          
          window.speechSynthesis.speak(utterance);
          
        } catch (error) {
          console.error('❌ Web Speech API failed:', error);
          resolve();
        }
      }
    });
    
    // Store promise globally to prevent overlapping
    window.currentSpeechPromise = speechPromise;
    await speechPromise;
    window.currentSpeechPromise = null;
    
    return Promise.resolve();
  };

  const handleGameStateUpdate = (data) => {
    console.log('Debate state update:', data.type);
    
    if (data.type === 'debate_created') {
      setMessage('Debate started! Generating arguments...');
    } else if (data.type === 'argument_generated') {
      // Add argument to list
      setDebateArgs(prev => [...prev, data.argument]);
      setCurrentSpeaker(data.argument.position);
      setMessage(`${data.argument.position} is speaking...`);
      
      // Queue speech (don't await here to avoid blocking WebSocket)
      setTimeout(() => {
        speakArgument(data.argument.argument, data.argument.position).then(() => {
          console.log(`✅ Finished speaking ${data.argument.position} argument`);
          setCurrentSpeaker(null);
        }).catch(err => {
          console.error('Speech error:', err);
          setCurrentSpeaker(null);
        });
      }, 500); // Small delay to ensure UI updates first
    } else if (data.type === 'debate_finished') {
      setMessage('Debate finished! Judge is evaluating...');
    } else if (data.type === 'judgment_complete') {
      setJudgment(data.judgment);
      setGameStatus('finished');
      setMessage('Judgment complete!');
    } else if (data.type === 'error') {
      setMessage(`Error: ${data.message}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Initialize Vapi
  useEffect(() => {
    const vapiKey = import.meta.env.VITE_VAPI_API_KEY;
    if (vapiKey) {
      try {
        const vapi = new Vapi(vapiKey);
        setVapiInstance(vapi);
        
        // Listen to Vapi events
        vapi.on('call-start', () => {
          console.log('🎤 Voice call started');
          setIsSpeaking(true);
        });
        vapi.on('call-end', () => {
          console.log('🎤 Voice call ended');
          setIsSpeaking(false);
        });
        vapi.on('speech-start', () => {
          console.log('🗣️ AI started speaking');
        });
        vapi.on('speech-end', () => {
          console.log('🗣️ AI finished speaking');
        });
      } catch (error) {
        console.warn('Failed to initialize Vapi:', error);
      }
    } else {
      console.log('🔇 Vapi disabled - no VITE_VAPI_API_KEY found');
    }
  }, []);

  return (
    <div className="debate-game">
      <SidebarVote 
        gameId={gameId} 
        gameName={`Debate: ${player1DisplayName} vs ${player2DisplayName}`} 
      />
      
      {/* Topic Input Modal */}
      {showTopicModal && (
        <div className="topic-modal-overlay">
          <div className="topic-modal">
            <h2 className="topic-modal-title">Enter Debate Topic</h2>
            <p className="topic-modal-subtitle">
              {player1DisplayName} will argue PRO<br />
              {player2DisplayName} will argue CON
            </p>
            
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startDebate()}
              placeholder="e.g., AI should be regulated by government"
              className="topic-input"
              autoFocus
            />
            
            <div className="topic-modal-buttons">
              <button onClick={onBack} className="topic-cancel-button">
                Cancel
              </button>
              <button onClick={startDebate} className="topic-start-button">
                Start Debate
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Debate View */}
      {!showTopicModal && (
        <>
          <div className="debate-header">
            <GameTimer isActive={gameStatus === 'in_progress'} />
            <div className="debate-topic">
              <h2>{topic}</h2>
              <div className="debate-status">{message}</div>
            </div>
          </div>

          <div className="debate-container">
            {/* PRO Side (Left) */}
            <div className={`debate-side pro-side ${currentSpeaker === 'PRO' ? 'speaking' : ''}`}>
              <div className="debater-header">
                <h3>{player1DisplayName}</h3>
                <span className="position-label">PRO</span>
              </div>
              
              <div className="arguments-list">
                {debateArgs
                  .filter(arg => arg.position === 'PRO')
                  .map((arg, index) => (
                    <div key={`pro-${index}`} className="argument-card">
                      <div className="argument-round">Round {arg.round}</div>
                      <div className="argument-text">
                        {currentlyTyping && currentlyTyping.position === 'PRO' && 
                         debateArgs.filter(a => a.position === 'PRO').length - 1 === index
                          ? currentlyTyping.text
                          : arg.argument}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Center Divider */}
            <div className="debate-divider">
              <div className="vs-text">VS</div>
              {(currentSpeaker || isSpeaking) && (
                <div className="speaking-indicator">
                  <div className="speaking-dot"></div>
                  <span>{currentSpeaker} Speaking</span>
                  {isSpeaking && <span className="voice-status"> (Voice Active)</span>}
                </div>
              )}
            </div>

            {/* CON Side (Right) */}
            <div className={`debate-side con-side ${currentSpeaker === 'CON' ? 'speaking' : ''}`}>
              <div className="debater-header">
                <h3>{player2DisplayName}</h3>
                <span className="position-label">CON</span>
              </div>
              
              <div className="arguments-list">
                {debateArgs
                  .filter(arg => arg.position === 'CON')
                  .map((arg, index) => (
                    <div key={`con-${index}`} className="argument-card">
                      <div className="argument-round">Round {arg.round}</div>
                      <div className="argument-text">
                        {currentlyTyping && currentlyTyping.position === 'CON' && 
                         debateArgs.filter(a => a.position === 'CON').length - 1 === index
                          ? currentlyTyping.text
                          : arg.argument}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Judgment Section */}
          {judgment && (
            <div className="judgment-section">
              <h3 className="judgment-title">⚖️ FINAL JUDGMENT</h3>
              
              <div className="judgment-scores">
                <div className="score-card pro-score">
                  <h4>{player1DisplayName} (PRO)</h4>
                  <div className="score-details">
                    <div>Structure: {judgment.pro_scores.structure.score}/30</div>
                    <div>Depth: {judgment.pro_scores.depth.score}/20</div>
                    <div>Rebuttal: {judgment.pro_scores.rebuttal.score}/30</div>
                    <div>Relevance: {judgment.pro_scores.relevance.score}/20</div>
                  </div>
                  <div className="total-score">Total: {judgment.pro_total}/100</div>
                </div>

                <div className="winner-announcement">
                  <div className="trophy">🏆</div>
                  <div className="winner-name">{judgment.winner} WINS!</div>
                  <div className="margin">by {judgment.margin}</div>
                </div>

                <div className="score-card con-score">
                  <h4>{player2DisplayName} (CON)</h4>
                  <div className="score-details">
                    <div>Structure: {judgment.con_scores.structure.score}/30</div>
                    <div>Depth: {judgment.con_scores.depth.score}/20</div>
                    <div>Rebuttal: {judgment.con_scores.rebuttal.score}/30</div>
                    <div>Relevance: {judgment.con_scores.relevance.score}/20</div>
                  </div>
                  <div className="total-score">Total: {judgment.con_total}/100</div>
                </div>
              </div>

              <div className="judgment-analysis">
                <p>{judgment.overall_analysis}</p>
              </div>

              <button onClick={onBack} className="back-to-menu-button">
                Back to Menu
              </button>
            </div>
          )}
        </>
      )}

      {/* Connection Status */}
      {!isConnected && !showTopicModal && (
        <div className="connection-status">
          Not connected to server
        </div>
      )}
    </div>
  );
};

export default DebateGame; 