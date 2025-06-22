import { useState, useEffect } from 'react'

const ModernTile = ({ letter, status, delay = 0 }) => {
  const [isRevealed, setIsRevealed] = useState(false)
  
  useEffect(() => {
    if (letter && status !== 'empty') {
      const timer = setTimeout(() => {
        setIsRevealed(true)
      }, delay * 100)
      return () => clearTimeout(timer)
    }
  }, [letter, status, delay])
  
  const getStatusClasses = () => {
    if (!isRevealed && status !== 'empty') {
      return 'bg-transparent border-gray-600'
    }
    
    switch (status) {
      case 'green':
        return 'bg-green-500 border-green-500 text-white'
      case 'yellow':
        return 'bg-yellow-500 border-yellow-500 text-white'
      case 'black':
      case 'gray':
        return 'bg-gray-700 border-gray-700 text-white'
      default:
        return 'bg-transparent border-gray-600'
    }
  }
  
  return (
    <div 
      className={`
        w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 flex items-center justify-center
        font-bold text-4xl lg:text-5xl xl:text-6xl uppercase
        border-4 rounded-lg
        transition-all duration-500
        ${getStatusClasses()}
        ${isRevealed && status !== 'empty' ? 'tile-flip' : ''}
        ${letter && status === 'empty' ? 'scale-110' : ''}
      `}
    >
      {letter}
    </div>
  )
}

const ModernGameBoard = ({ guesses, feedback, modelName, isWinner, guessCount }) => {
  const rows = []
  const maxRows = 6
  
  // Add completed guesses
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
          delay={j}
        />
      )
    }
    
    rows.push(
      <div key={i} className="flex gap-3 justify-center">
        {tiles}
      </div>
    )
  }
  
  // Add empty rows
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
      {/* Model name header */}
      <div className="text-center mb-8">
        <h3 className="text-4xl lg:text-5xl font-bold text-white mb-3">{modelName}</h3>
        <div className="text-xl lg:text-2xl text-gray-400">
          Guesses: {guessCount}/6
        </div>
      </div>
      
      {/* Game Board */}
      <div className={`
        p-8 rounded-2xl bg-gray-900/30 backdrop-blur-sm
        ${isWinner ? 'ring-4 ring-green-500 ring-opacity-50' : ''}
        transition-all duration-500
      `}>
        <div className="flex flex-col gap-3">
          {rows}
        </div>
      </div>
      
      {/* Winner indicator */}
      {isWinner && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-green-500 text-white px-8 py-3 rounded-full font-bold text-2xl animate-bounce shadow-2xl">
            🏆 WINNER!
          </div>
        </div>
      )}
    </div>
  )
}

export default ModernGameBoard 