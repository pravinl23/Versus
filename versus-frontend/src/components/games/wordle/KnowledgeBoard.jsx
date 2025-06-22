const KnowledgeBoard = ({ knowledge, modelName }) => {
  if (!knowledge) return null
  
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const modelColor = modelName === 'GPT-4o' ? 'green' : 'blue'
  
  const getLetterStatus = (letter) => {
    if (Object.values(knowledge.green_letters || {}).includes(letter)) {
      return 'green'
    }
    if (knowledge.yellow_letters?.includes(letter)) {
      return 'yellow'
    }
    if (knowledge.black_letters?.includes(letter)) {
      return 'black'
    }
    return 'unknown'
  }
  
  const getLetterClasses = (status) => {
    switch (status) {
      case 'green':
        return 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/25'
      case 'yellow':
        return 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/25'
      case 'black':
        return 'bg-gray-700 text-gray-400 border-gray-700'
      default:
        return 'bg-gray-800/50 text-gray-400 border-gray-600/50 hover:bg-gray-700/50 transition-colors'
    }
  }
  
  return (
    <div className="mt-4 p-5 bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 shadow-lg">
      <h4 className={`text-sm font-bold mb-4 flex items-center ${modelColor === 'green' ? 'text-green-400' : 'text-blue-400'}`}>
        <span className="mr-2">🔤</span>
        {modelName}'s Letter Knowledge
      </h4>
      <div className="flex flex-wrap gap-2 justify-center">
        {alphabet.map(letter => {
          const status = getLetterStatus(letter)
          return (
            <div
              key={letter}
              className={`
                w-8 h-8 flex items-center justify-center
                text-sm font-bold rounded-lg border transition-all duration-300
                ${getLetterClasses(status)}
                ${status !== 'unknown' ? 'transform hover:scale-110' : ''}
              `}
              title={
                status === 'green' ? 'Confirmed in correct position' :
                status === 'yellow' ? 'In word, wrong position' :
                status === 'black' ? 'Not in word' :
                'Status unknown'
              }
            >
              {letter}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KnowledgeBoard 