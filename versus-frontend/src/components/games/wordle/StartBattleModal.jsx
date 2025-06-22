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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-lg w-full p-8 border border-gray-700/50 shadow-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚔️</div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 mb-3">
            Battle Setup
          </h2>
          <p className="text-gray-300 text-lg">
            Choose the secret word for the AI showdown
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-xl p-6 mb-6 border border-gray-600/30">
          <p className="text-gray-300 text-center leading-relaxed">
            Enter a <span className="font-bold text-white">5-letter word</span> that 
            <span className="text-green-400 font-semibold"> GPT-4o</span> and 
            <span className="text-blue-400 font-semibold"> Claude</span> will compete to solve!
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={word}
              onChange={(e) => {
                setWord(e.target.value)
                setError('')
              }}
              placeholder="ENTER WORD"
              className="w-full px-6 py-4 bg-gray-800/50 border-2 border-gray-600/50 rounded-xl text-2xl font-black uppercase tracking-[0.5em] text-center text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/70 focus:bg-gray-800/70 transition-all duration-300"
              maxLength={5}
              autoFocus
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3">
              <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}
          
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl font-bold text-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 focus:ring-4 focus:ring-green-500/30"
            >
              🚀 Start Battle
            </button>
          </div>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="text-center text-gray-400 text-sm">
            <p>💡 Choose any 5-letter word - the AIs will figure it out!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StartBattleModal 