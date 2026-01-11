import { useState, useEffect } from 'react'

const GameStats = ({ stats, isActive = false }) => {
  return (
    <div className={`
      bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl 
      rounded-2xl p-6 border transition-all duration-500
      ${isActive ? 'border-emerald-400/50 shadow-lg shadow-emerald-400/20' : 'border-slate-700/50'}
    `}>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-black text-white mb-1">{stats.guesses}</div>
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Guesses</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black text-emerald-400 mb-1">{stats.correct}</div>
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Correct</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black text-amber-400 mb-1">{stats.partial}</div>
          <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">Partial</div>
        </div>
      </div>
    </div>
  )
}

const TurnIndicator = ({ currentTurn, isThinking = false }) => {
  return (
    <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-600/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'} shadow-lg`}></div>
            {isThinking && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-amber-400 animate-ping"></div>
            )}
          </div>
          <span className="text-white font-bold text-lg">Turn {currentTurn}</span>
        </div>
        {isThinking && (
          <div className="flex items-center gap-2 text-amber-400">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm font-medium">AI Thinking...</span>
          </div>
        )}
      </div>
    </div>
  )
}

const GameRules = ({ isExpanded, onToggle }) => {
  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden transition-all duration-500">
      <button 
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-slate-700/30 transition-colors duration-300"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <span className="text-2xl">📖</span>
            Game Rules
          </h3>
          <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in-up">
          <div className="flex items-center gap-3 p-3 bg-emerald-900/20 rounded-xl border border-emerald-700/30">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <div>
              <div className="text-emerald-400 font-semibold text-sm">Green = Correct</div>
              <div className="text-slate-300 text-sm">Letter is in the word and in the right position</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-amber-900/20 rounded-xl border border-amber-700/30">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-white font-bold">B</div>
            <div>
              <div className="text-amber-400 font-semibold text-sm">Yellow = Wrong Position</div>
              <div className="text-slate-300 text-sm">Letter is in the word but in the wrong position</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-700/20 rounded-xl border border-slate-600/30">
            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <div>
              <div className="text-slate-400 font-semibold text-sm">Gray = Not in Word</div>
              <div className="text-slate-300 text-sm">Letter is not in the word at all</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const AIStrategy = ({ modelName, strategy, thinking, constraints = [] }) => {
  const isGPT = modelName === 'GPT-4o'
  
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">{isGPT ? '🤖' : '🧠'}</div>
        <h3 className={`font-bold text-lg ${isGPT ? 'text-emerald-400' : 'text-blue-400'}`}>
          {modelName}'s Strategy
        </h3>
      </div>
      
      {strategy && (
        <div className={`rounded-xl p-4 mb-4 border ${isGPT ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-blue-900/20 border-blue-700/30'}`}>
          <div className={`font-semibold text-sm mb-2 ${isGPT ? 'text-emerald-400' : 'text-blue-400'}`}>Current Approach</div>
          <div className="text-slate-300 text-sm leading-relaxed">{strategy}</div>
        </div>
      )}
      
      {thinking && (
        <div className="bg-slate-700/30 rounded-xl p-4 mb-4 border border-slate-600/30">
          <div className="text-slate-300 text-sm leading-relaxed italic">"{thinking}"</div>
        </div>
      )}
      
      {constraints.length > 0 && (
        <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700/30">
          <div className="text-purple-400 font-semibold text-sm mb-3 flex items-center gap-2">
            <span>🎯</span>
            Current Constraints
          </div>
          <div className="space-y-2">
            {constraints.slice(0, 3).map((constraint, index) => (
              <div key={index} className="text-slate-300 text-sm flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>{constraint}</span>
              </div>
            ))}
            {constraints.length > 3 && (
              <div className="text-slate-400 text-xs mt-2">
                +{constraints.length - 3} more constraints...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ModernGameInterface = ({ 
  currentTurn, 
  isThinking, 
  gameStats,
  strategies,
  gameState 
}) => {
  const [rulesExpanded, setRulesExpanded] = useState(false)
  
  return (
    <div className="space-y-6">
      {/* Turn Indicator */}
      <TurnIndicator currentTurn={currentTurn} isThinking={isThinking} />
      
      {/* Game Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wide">GPT-4o Stats</h3>
          <GameStats 
            stats={gameStats?.openai || { guesses: 0, correct: 0, partial: 0 }}
            isActive={gameState?.winner === 'openai'}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wide">Claude Stats</h3>
          <GameStats 
            stats={gameStats?.anthropic || { guesses: 0, correct: 0, partial: 0 }}
            isActive={gameState?.winner === 'anthropic'}
          />
        </div>
      </div>
      
      {/* Game Rules */}
      <GameRules isExpanded={rulesExpanded} onToggle={() => setRulesExpanded(!rulesExpanded)} />
      
      {/* AI Strategies */}
      {strategies && (
        <div className="space-y-4">
          <h3 className="text-white font-bold text-lg">AI Analysis</h3>
          
          {strategies.openai && (
            <AIStrategy 
              modelName="GPT-4o"
              strategy={strategies.openai.strategy}
              thinking={strategies.openai.thinking}
              constraints={strategies.openai.knowledge?.constraints || []}
            />
          )}
          
          {strategies.anthropic && (
            <AIStrategy 
              modelName="Claude"
              strategy={strategies.anthropic.strategy}
              thinking={strategies.anthropic.thinking}
              constraints={strategies.anthropic.knowledge?.constraints || []}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ModernGameInterface 