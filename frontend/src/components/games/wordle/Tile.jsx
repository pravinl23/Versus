import { useEffect, useState } from 'react'

const Tile = ({ letter, status, delay = 0 }) => {
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
      return 'bg-gray-800 border-2 border-gray-600 text-white shadow-md'
    }
    
    switch (status) {
      case 'green':
        return 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/25'
      case 'yellow':
        return 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25'
      case 'black':
      case 'gray':
        return 'bg-gray-700 text-white border-gray-700 shadow-md'
      default:
        return 'bg-gray-800 border-2 border-gray-600 text-white shadow-md'
    }
  }
  
  return (
    <div 
      className={`
        w-16 h-16 flex items-center justify-center
        text-2xl font-bold uppercase
        transition-all duration-500 ease-in-out
        ${getStatusClasses()}
        ${letter && !isFlipped ? 'border-gray-500 scale-105' : ''}
        ${isFlipped ? 'rotate-x-180' : ''}
        rounded-lg
        hover:scale-105
        font-mono
        tracking-wide
      `}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)'
      }}
    >
      <span className="drop-shadow-sm">{letter}</span>
    </div>
  )
}

export default Tile 