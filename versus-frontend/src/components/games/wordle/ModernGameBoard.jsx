import { useState, useEffect } from 'react'

const ModernTile = ({ letter, status, delay = 0, size = 'large' }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  
  useEffect(() => {
    if (letter && status !== 'empty') {
      const timer = setTimeout(() => {
        setIsFlipped(true)
      }, delay * 1000)
      
      return () => clearTimeout(timer)
    }
  }, [letter, status, delay])
  
  const getStatusClasses = () => {
    if (status === 'empty' || !isFlipped) {
      return 'bg-slate-800 border-2 border-slate-600 text-white shadow-lg'
    }
    
    switch (status) {
      case 'green':
        return 'bg-emerald-500 text-white border-emerald-500 shadow-2xl shadow-emerald-500/30'
      case 'yellow':
        return 'bg-amber-400 text-white border-amber-400 shadow-2xl shadow-amber-400/30'
      case 'black':
      case 'gray':
        return 'bg-slate-600 text-white border-slate-600 shadow-lg'
      default:
        return 'bg-slate-800 border-2 border-slate-600 text-white shadow-lg'
    }
  }
  
  const sizeClasses = size === 'large' 
    ? 'w-20 h-20 text-4xl' 
    : 'w-16 h-16 text-2xl'
  
  return (
    <div 
      className={`
        ${sizeClasses} flex items-center justify-center
        font-black uppercase
        transition-all duration-700 ease-out
        ${getStatusClasses()}
        ${letter && !isFlipped ? 'border-slate-500 scale-105' : ''}
        ${isFlipped ? 'rotate-x-180' : ''}
        rounded-xl
        hover:scale-110
        font-mono
        tracking-wider
        relative
        overflow-hidden
      `}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
      }}
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 rounded-xl"></div>
      
      {/* Letter */}
      <span className="relative z-10 drop-shadow-lg">{letter}</span>
      
      {/* Shine effect */}
      {status !== 'empty' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
      )}
    </div>
  )
}

const ModernGameBoard = ({ guesses, feedback, modelName, isWinner, guessCount }) => {
  const rows = []
  const maxRows = 6
  
  // Add completed guesses (showing max 6 rows on main board)
  for (let i = 0; i < Math.min(guesses.length, maxRows); i++) {
    const guess = guesses[i]
    const fb = feedback[i]
    const tiles = []
    
    for (let j = 0; j < 5; j++) {
      tiles.push(
        <ModernTile 
          key={`${i}-${j}`}
          letter={guess[j]}
          status={fb[j]}
          delay={i * 0.15 + j * 0.08}
        />
      )
    }
    
    rows.push(
      <div key={i} className="flex gap-3 justify-center">
        {tiles}
      </div>
    )
  }
  
  // Add empty rows to complete the 6x5 grid
  const remainingRows = maxRows - Math.min(guesses.length, maxRows)
  for (let i = 0; i < remainingRows; i++) {
    const tiles = []
    for (let j = 0; j < 5; j++) {
      tiles.push(
        <ModernTile 
          key={`empty-${i}-${j}`}
          letter=""
          status="empty"
        />
      )
    }
    
    rows.push(
      <div key={`empty-row-${i}`} className="flex gap-3 justify-center">
        {tiles}
      </div>
    )
  }
  
  return (
    <div className="relative">
      {/* Main Game Board */}
      <div className={`
        relative p-8 rounded-3xl backdrop-blur-xl
        ${isWinner 
          ? 'bg-gradient-to-br from-emerald-900/30 via-emerald-800/20 to-emerald-900/30 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-400/20' 
          : 'bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 border border-slate-700/50'
        }
        transition-all duration-1000 ease-out
        shadow-2xl
        before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none
      `}>
        
        {/* Winning glow effect */}
        {isWinner && (
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-emerald-400/20 blur-xl animate-pulse"></div>
        )}
        
        {/* Board Grid */}
        <div className="relative z-10 flex flex-col gap-3">
          {rows}
        </div>
        
        {/* Overflow indicator */}
        {guesses.length > maxRows && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800/80 backdrop-blur-sm text-slate-300 text-sm border border-slate-600/50">
              <div className="w-2 h-2 bg-slate-400 rounded-full mr-3 animate-pulse"></div>
              <span className="font-medium">+{guesses.length - maxRows} more attempts</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Model info overlay */}
      <div className="absolute -top-4 left-4 right-4">
        <div className="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-lg rounded-2xl px-6 py-3 border border-slate-600/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${modelName === 'GPT-4o' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-blue-400 shadow-lg shadow-blue-400/50'} animate-pulse`}></div>
              <span className={`font-bold text-lg ${modelName === 'GPT-4o' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {modelName}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-slate-300 text-sm font-medium">Attempts</div>
                <div className="text-white text-2xl font-black">{guessCount}</div>
              </div>
              {isWinner && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-400/20 rounded-full border border-emerald-400/30">
                  <span className="text-emerald-400 text-lg">🏆</span>
                  <span className="font-bold text-emerald-300 text-sm">WINNER</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernGameBoard 