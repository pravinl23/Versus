import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const SimpleDebateGame = () => {
  // States
  const [debateId, setDebateId] = useState(null);
  const [topic, setTopic] = useState('');
  const [model1, setModel1] = useState('gpt-4o-mini');
  const [model2, setModel2] = useState('gpt-4o-mini');
  const [judgeModel, setJudgeModel] = useState('gpt-4o');
  const [debateArgs, setDebateArgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vapiInstance, setVapiInstance] = useState(null);
  const [currentSpeaking, setCurrentSpeaking] = useState(null);
  const [voiceSession, setVoiceSession] = useState(null);
  const [autoDebating, setAutoDebating] = useState(false);
  const [debateFinished, setDebateFinished] = useState(false);
  const [judgment, setJudgment] = useState(null);
  const [currentlyTyping, setCurrentlyTyping] = useState(null); // {text: "", position: "PRO/CON", index: 0}
  const [typingComplete, setTypingComplete] = useState(true);

  // Initialize Vapi (you'll need to add VAPI_API_KEY to your .env)
  useEffect(() => {
    const vapiKey = import.meta.env.VITE_VAPI_API_KEY;
    if (vapiKey) {
      try {
        const vapi = new Vapi(vapiKey);
        setVapiInstance(vapi);
        
        // Listen to Vapi events
        vapi.on('call-start', () => {
          console.log('🎤 Voice call started');
          setCurrentSpeaking('vapi');
        });
        vapi.on('call-end', () => {
          console.log('🎤 Voice call ended');
          setCurrentSpeaking(null);
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

  // Create new debate
  const createDebate = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/create-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, model1, model2, judge_model: judgeModel })
      });

      const data = await response.json();
      if (data.success) {
        setDebateId(data.debate_id);
        setAutoDebating(true);
        console.log(`🎭 Created debate: ${data.debate_id}`);
        
        // Start automatic debate with small delay
        setTimeout(() => {
          startAutomaticDebate(data.debate_id);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Failed to create debate:', error);
      alert('Failed to create debate');
    } finally {
      setLoading(false);
    }
  };

  // Start automatic debate
  const startAutomaticDebate = async (debateId) => {
    let round = 0;
    const maxRounds = 6;
    
    while (round < maxRounds && !debateFinished) {
      try {
        console.log(`🎯 Auto-generating argument ${round + 1}/${maxRounds}`);
        
        const result = await generateSingleArgument(debateId);
        if (result && result.debate_finished) {
          console.log('🏁 Debate finished! Starting judgment...');
          setDebateFinished(true);
          setAutoDebating(false);
          
          // Start judging after small delay
          setTimeout(() => {
            judgeDebate(debateId);
          }, 2000);
          break;
        }
        
        // Wait for speech to complete, then add extra pause
        if (result && result.argument && result.argument.argument) {
          console.log('🎤 Waiting for speech to complete...');
          await speakArgument(result.argument.argument, result.argument.position);
          console.log('✅ Speech completed, pausing before next argument...');
          // Additional pause after speech completes
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Fallback pause if no speech
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        round++;
        
      } catch (error) {
        console.error('❌ Error in auto debate:', error);
        setAutoDebating(false);
        break;
      }
    }
  };

  // Generate single argument (extracted from original function)
  const generateSingleArgument = async (debateId) => {
    if (!debateId) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/generate-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debate_id: debateId })
      });

      const data = await response.json();
      if (data.success) {
        setDebateArgs(prev => [...prev, data.argument]);
        return data; // Return data for auto-debate tracking
      }
    } catch (error) {
      console.error('❌ Failed to generate argument:', error);
      return null;
    }
  };

  // Judge the debate
  const judgeDebate = async (debateId) => {
    try {
      console.log('⚖️ Starting judgment...');
      setLoading(true);
      
      const response = await fetch('http://localhost:8001/judge-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debate_id: debateId })
      });

      const data = await response.json();
      if (data.success) {
        setJudgment(data.judgment);
        console.log('⚖️ Judgment received:', data.judgment);
      } else {
        console.error('❌ Judgment failed:', data);
      }
    } catch (error) {
      console.error('❌ Failed to judge debate:', error);
    } finally {
      setLoading(false);
    }
  };

  // Typewriter effect - shows words as they're spoken
  const startTypewriterEffect = (fullText, position) => {
    const words = fullText.split(' ');
    const speechRate = 1.4;
    const avgWPM = 150 * speechRate; // Average words per minute * speech rate
    const msPerWord = (60 / avgWPM) * 1000; // Milliseconds per word
    
    setCurrentlyTyping({ text: '', position, fullText });
    setTypingComplete(false);
    
    let wordIndex = 0;
    const typeInterval = setInterval(() => {
      if (wordIndex < words.length) {
        const displayText = words.slice(0, wordIndex + 1).join(' ');
        setCurrentlyTyping({ text: displayText, position, fullText });
        wordIndex++;
      } else {
        clearInterval(typeInterval);
        setTypingComplete(true);
        setCurrentlyTyping(null);
      }
    }, msPerWord);
    
    // Cleanup function
    return () => clearInterval(typeInterval);
  };

  // Speak argument using simple TTS (no interaction)
  const speakArgument = async (text, position) => {
    console.log(`🎤 Speaking ${position} argument:`, text);
    
    // Try Web Speech API first (simple, no interaction)
    if ('speechSynthesis' in window) {
      try {
        // Stop any existing speech
        window.speechSynthesis.cancel();
        
        // Wait a moment for the cancel to take effect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.4; // Much faster speech
        
        // Get available voices and select male/female
        const voices = window.speechSynthesis.getVoices();
        
        if (position === "PRO") {
          // Find a male voice for PRO
          const maleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('male') ||
            voice.name.toLowerCase().includes('david') ||
            voice.name.toLowerCase().includes('daniel') ||
            voice.name.toLowerCase().includes('alex') ||
            voice.name.toLowerCase().includes('arthur')
          ) || voices.find(voice => 
            voice.lang.startsWith('en') && !voice.name.toLowerCase().includes('female')
          );
          
          if (maleVoice) {
            utterance.voice = maleVoice;
            console.log(`🎭 PRO using voice: ${maleVoice.name}`);
          }
          utterance.pitch = 0.9; // Slightly lower for male
        } else {
          // Find a female voice for CON
          const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') ||
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('victoria') ||
            voice.name.toLowerCase().includes('karen') ||
            voice.name.toLowerCase().includes('susan')
          ) || voices.find(voice => 
            voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
          );
          
          if (femaleVoice) {
            utterance.voice = femaleVoice;
            console.log(`🎭 CON using voice: ${femaleVoice.name}`);
          }
          utterance.pitch = 1.1; // Slightly higher for female
        }
        
        // Return a promise that resolves when speech finishes
        return new Promise((resolve) => {
          let cleanupTypewriter = null;
          
          utterance.onstart = () => {
            setCurrentSpeaking('tts');
            console.log('🗣️ Started speaking');
            // Start typewriter effect when speech begins
            cleanupTypewriter = startTypewriterEffect(text, position);
          };
          
          utterance.onend = () => {
            setCurrentSpeaking(null);
            console.log('🗣️ Finished speaking');
            // Cleanup typewriter effect
            if (cleanupTypewriter) cleanupTypewriter();
            setCurrentlyTyping(null);
            setTypingComplete(true);
            resolve(); // Resolve when speech finishes
          };
          
          utterance.onerror = (e) => {
            console.error('❌ Speech error:', e);
            setCurrentSpeaking(null);
            // Cleanup typewriter effect on error
            if (cleanupTypewriter) cleanupTypewriter();
            setCurrentlyTyping(null);
            setTypingComplete(true);
            resolve(); // Resolve even on error to continue
          };
          
          // Ensure voices are loaded before speaking
          if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
              window.speechSynthesis.speak(utterance);
            }, { once: true });
          } else {
            window.speechSynthesis.speak(utterance);
          }
        });
        
      } catch (error) {
        console.error('❌ Web Speech API failed:', error);
      }
    }
    
    // Fallback: Use Vapi but with strict TTS-only configuration
    if (vapiInstance) {
      try {
        // Stop any existing call
        try {
          vapiInstance.stop();
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          // Ignore if no active call
        }
        
        // Minimal TTS-only configuration
        const assistant = {
          voice: {
            provider: "11labs",
            voiceId: position === "PRO" ? "21m00Tcm4TlvDq8ikWAM" : "AZnzlk1XvdvUeBnXmlld"
          },
          firstMessage: text,
          recordingEnabled: false
        };

        await vapiInstance.start(assistant);
        
        // Return a promise that resolves after expected speech duration
        return new Promise((resolve) => {
          setTimeout(() => {
            try {
              vapiInstance.stop();
            } catch (e) {
              // Ignore
            }
            resolve();
          }, Math.max(2000, text.length * 80));
        });
        
      } catch (error) {
        console.error('❌ Vapi TTS failed:', error);
        return Promise.resolve(); // Return resolved promise on error
      }
    }
    
    // Return resolved promise if no voice available
    return Promise.resolve();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎭 Simple AI Debate
          </h1>
          <p className="text-slate-300 text-xl">Voice-Powered Arguments</p>
        </div>

        {!debateId ? (
          /* Setup Form */
          <div className="bg-slate-800/50 rounded-2xl p-8 backdrop-blur-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Setup Debate</h2>
            
            {/* Topic Input */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">Debate Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., AI should be regulated by government"
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Model Selection */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-blue-400 font-medium mb-2">PRO Debater</label>
                <select
                  value={model1}
                  onChange={(e) => setModel1(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o-mini">GPT-4 Mini</option>
                  <option value="gpt-4o">GPT-4</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-flash">Gemini Flash</option>
                </select>
              </div>
              
              <div>
                <label className="block text-yellow-400 font-medium mb-2">⚖️ Judge</label>
                <select
                  value={judgeModel}
                  onChange={(e) => setJudgeModel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="gpt-4o">GPT-4 (Recommended)</option>
                  <option value="gpt-4o-mini">GPT-4 Mini</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-flash">Gemini Flash</option>
                </select>
              </div>
              
              <div>
                <label className="block text-red-400 font-medium mb-2">CON Debater</label>
                <select
                  value={model2}
                  onChange={(e) => setModel2(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="gpt-4o-mini">GPT-4 Mini</option>
                  <option value="gpt-4o">GPT-4</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-flash">Gemini Flash</option>
                </select>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={createDebate}
              disabled={loading || !topic.trim() || autoDebating}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold text-lg rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Debate...' : autoDebating ? 'Debate Running...' : '🎭 Start Auto Debate'}
            </button>
          </div>
        ) : (
          /* Debate View */
          <div className="space-y-6">
            
            {/* Topic Display */}
            <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-xl border border-slate-700 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Debate Topic</h2>
              <p className="text-slate-300 text-lg">"{topic}"</p>
                             <div className="flex justify-center items-center gap-8 mt-4">
                 <div className="text-blue-400">
                   <span className="font-bold">PRO:</span> {model1}
                 </div>
                 <div className="text-4xl">⚔️</div>
                 <div className="text-yellow-400">
                   <span className="font-bold">JUDGE:</span> {judgeModel}
                 </div>
                 <div className="text-4xl">⚔️</div>
                 <div className="text-red-400">
                   <span className="font-bold">CON:</span> {model2}
                 </div>
               </div>
            </div>

            {/* Arguments Display */}
            <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-xl border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Arguments ({debateArgs.length}/6)</h3>
                
                {/* Voice Status */}
                {currentSpeaking && (
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-4 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-6 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-5 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="font-medium">
                      🎤 {currentlyTyping?.position === 'PRO' ? `${model1} Speaking` : currentlyTyping?.position === 'CON' ? `${model2} Speaking` : 'AI Speaking'}
                    </span>
                  </div>
                )}
              </div>

              {/* Split Arguments Layout - PRO Left, CON Right */}
              <div className="grid grid-cols-2 gap-6 mb-6 min-h-[400px]">
                
                {/* PRO Arguments (Left Side) */}
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-blue-400 text-center mb-4">
                    👤 PRO ({model1})
                  </h4>
                  
                  {debateArgs
                    .filter(arg => arg.position === 'PRO')
                    .map((arg, index) => (
                    <div
                      key={`pro-${index}`}
                      className="p-4 rounded-xl bg-blue-900/30 border-l-4 border-blue-400"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-blue-400">
                          Round {arg.round}
                        </span>
                        <span className="text-slate-400 text-xs">{arg.model}</span>
                      </div>
                      <p className="text-white leading-relaxed">{arg.argument}</p>
                    </div>
                  ))}
                  
                  {/* Currently Typing PRO */}
                  {currentlyTyping && currentlyTyping.position === 'PRO' && (
                    <div className="p-4 rounded-xl bg-blue-900/50 border-l-4 border-blue-400 border-dashed">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-blue-400 flex items-center gap-2">
                          Round {Math.floor(debateArgs.length / 2) + 1}
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </span>
                        <span className="text-slate-400 text-xs">Speaking...</span>
                      </div>
                      <p className="text-white leading-relaxed">
                        {currentlyTyping.text}
                        <span className="animate-pulse text-blue-400">|</span>
                      </p>
                    </div>
                  )}
                  
                  {debateArgs.filter(arg => arg.position === 'PRO').length === 0 && !currentlyTyping && (
                    <div className="text-center text-blue-300/50 py-8">
                      Waiting for PRO arguments...
                    </div>
                  )}
                </div>
                
                {/* CON Arguments (Right Side) */}
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-red-400 text-center mb-4">
                    👤 CON ({model2})
                  </h4>
                  
                  {debateArgs
                    .filter(arg => arg.position === 'CON')
                    .map((arg, index) => (
                    <div
                      key={`con-${index}`}
                      className="p-4 rounded-xl bg-red-900/30 border-l-4 border-red-400"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-red-400">
                          Round {arg.round}
                        </span>
                        <span className="text-slate-400 text-xs">{arg.model}</span>
                      </div>
                      <p className="text-white leading-relaxed">{arg.argument}</p>
                    </div>
                  ))}
                  
                  {/* Currently Typing CON */}
                  {currentlyTyping && currentlyTyping.position === 'CON' && (
                    <div className="p-4 rounded-xl bg-red-900/50 border-l-4 border-red-400 border-dashed">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-red-400 flex items-center gap-2">
                          Round {Math.floor((debateArgs.length + 1) / 2) + 1}
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        </span>
                        <span className="text-slate-400 text-xs">Speaking...</span>
                      </div>
                      <p className="text-white leading-relaxed">
                        {currentlyTyping.text}
                        <span className="animate-pulse text-red-400">|</span>
                      </p>
                    </div>
                  )}
                  
                  {debateArgs.filter(arg => arg.position === 'CON').length === 0 && !currentlyTyping && (
                    <div className="text-center text-red-300/50 py-8">
                      Waiting for CON arguments...
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-Debate Status */}
              {autoDebating && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-3 text-blue-400 font-bold text-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                    🤖 AI Debate in Progress... ({debateArgs.length}/6 arguments)
                  </div>
                </div>
              )}
              
              {debateFinished && !judgment && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-3 text-yellow-400 font-bold text-lg">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent"></div>
                    ⚖️ Judge Evaluating Debate...
                  </div>
                </div>
              )}
              
              {judgment && (
                <div className="mt-6 p-6 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-2xl border border-yellow-600/30">
                  <h3 className="text-2xl font-bold text-yellow-400 mb-4 text-center">
                    ⚖️ FINAL JUDGMENT
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* PRO Scores */}
                    <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-600/30">
                      <h4 className="text-xl font-bold text-blue-400 mb-3">PRO ({model1})</h4>
                      <div className="space-y-2 text-sm">
                        <div>Structure: {judgment.pro_scores.structure.score}/30</div>
                        <div>Depth: {judgment.pro_scores.depth.score}/20</div>
                        <div>Rebuttal: {judgment.pro_scores.rebuttal.score}/30</div>
                        <div>Relevance: {judgment.pro_scores.relevance.score}/20</div>
                        <div className="font-bold text-lg border-t border-blue-600/30 pt-2">
                          Total: {judgment.pro_total}/100
                        </div>
                      </div>
                    </div>
                    
                    {/* CON Scores */}
                    <div className="bg-red-900/30 rounded-xl p-4 border border-red-600/30">
                      <h4 className="text-xl font-bold text-red-400 mb-3">CON ({model2})</h4>
                      <div className="space-y-2 text-sm">
                        <div>Structure: {judgment.con_scores.structure.score}/30</div>
                        <div>Depth: {judgment.con_scores.depth.score}/20</div>
                        <div>Rebuttal: {judgment.con_scores.rebuttal.score}/30</div>
                        <div>Relevance: {judgment.con_scores.relevance.score}/20</div>
                        <div className="font-bold text-lg border-t border-red-600/30 pt-2">
                          Total: {judgment.con_total}/100
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Winner */}
                  <div className="text-center p-4 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/30">
                    <div className="text-3xl font-black text-yellow-400 mb-2">
                      🏆 WINNER: {judgment.winner}
                    </div>
                    <div className="text-lg text-yellow-300">
                      Margin: {judgment.margin}
                    </div>
                    <div className="text-sm text-slate-300 mt-3 max-w-2xl mx-auto">
                      {judgment.overall_analysis}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setDebateId(null);
                setDebateArgs([]);
                setTopic('');
                setAutoDebating(false);
                setDebateFinished(false);
                setJudgment(null);
                setLoading(false);
                setCurrentSpeaking(null);
                setCurrentlyTyping(null);
                setTypingComplete(true);
                // Stop any ongoing speech
                window.speechSynthesis.cancel();
              }}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all duration-300"
            >
              🔄 Start New Debate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDebateGame; 