import { useState } from 'react'

const StartBattleModal = ({ onSubmit, onCancel }) => {
  const [word, setWord] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const upperWord = word.toUpperCase()
    
    // Validate input
    if (upperWord.length !== 5) {
      setError('Word must be exactly 5 letters')
      return
    }
    
    if (!/^[A-Z]+$/.test(upperWord)) {
      setError('Word must contain only letters')
      return
    }
    
    onSubmit(upperWord)
  }

  const handleKeyPress = (e) => {
    // Only allow letters
    if (!/[a-zA-Z]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Enter') {
      e.preventDefault()
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Close button */}
      <button
        onClick={onCancel}
        className="absolute top-8 right-8 text-gray-400 hover:text-white transition-colors p-2 z-10"
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col items-center justify-center w-full h-full px-4">
        <div className="text-center max-w-4xl w-full">
          <h1 className="text-7xl lg:text-8xl font-black text-white mb-6 tracking-tight">
            CHOOSE A WORD
          </h1>
          <p className="text-3xl lg:text-4xl text-gray-400 mb-20">
            The AIs will compete to guess your 5-letter word
          </p>
          
          {/* Word input */}
          <form onSubmit={handleSubmit} className="space-y-16">
            {/* Visual letter boxes */}
            <div className="flex justify-center gap-4 lg:gap-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`
                    w-28 h-28 lg:w-32 lg:h-32 border-4 rounded-2xl flex items-center justify-center
                    text-6xl lg:text-7xl font-black transition-all duration-200
                    ${word[i] 
                      ? 'border-white bg-white text-black transform scale-105 shadow-2xl' 
                      : 'border-gray-600 bg-gray-900/50'
                    }
                  `}
                >
                  {word[i] || ''}
                </div>
              ))}
            </div>
            
            <div className="relative max-w-3xl mx-auto">
              <input
                type="text"
                value={word}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                  if (val.length <= 5) {
                    setWord(val)
                    setError('')
                  }
                }}
                onKeyPress={handleKeyPress}
                className="w-full px-16 py-10 bg-gray-900 border-4 border-gray-700 rounded-3xl text-7xl font-black text-center text-white placeholder-gray-600 focus:outline-none focus:border-white transition-all duration-300"
                maxLength={5}
                autoFocus
                placeholder="TYPE"
                style={{ letterSpacing: '0.2em' }}
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-3xl font-bold animate-pulse">
                {error}
              </div>
            )}
            
            <div className="flex flex-col items-center gap-8">
              <button
                type="submit"
                disabled={word.length !== 5}
                className={`
                  px-24 py-8 rounded-3xl text-4xl font-black transition-all duration-300
                  transform hover:scale-105 active:scale-95
                  ${word.length === 5
                    ? 'bg-white text-black hover:bg-gray-200 shadow-2xl' 
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                START BATTLE
              </button>
              
              <p className="text-gray-500 text-2xl">
                Press Enter when ready
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default StartBattleModal 