const ReasoningBox = ({ reasoning, modelName, detailedReasoning }) => {
  if (!reasoning && !detailedReasoning) {
    return null
  }
  
  const modelColor = modelName === 'GPT-4o' ? 'green' : 'blue'
  
  return (
    <div className="mt-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
      <h3 className="font-bold text-white mb-4 flex items-center text-lg">
        <span className="mr-3 text-2xl">🤖</span>
        <span className={`text-transparent bg-clip-text ${modelColor === 'green' ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}>
          {modelName}'s Strategy
        </span>
      </h3>
      
      {detailedReasoning && (
        <div className="space-y-4">
          {/* Current Strategy */}
          <div className="bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-xl p-4 border border-gray-600/30">
            <div className={`font-semibold text-sm mb-2 ${modelColor === 'green' ? 'text-green-400' : 'text-blue-400'}`}>
              Turn {detailedReasoning.turn} - {detailedReasoning.strategy}
            </div>
            <div className="text-gray-300 text-sm leading-relaxed">{detailedReasoning.thinking}</div>
          </div>
          
          {/* Quick Knowledge Summary */}
          {detailedReasoning.knowledge && (
            <div className="grid grid-cols-3 gap-3">
              {/* Green Letters Summary */}
              {Object.keys(detailedReasoning.knowledge.green_letters).length > 0 && (
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-4 text-center border border-green-700/30 shadow-lg">
                  <div className="text-green-400 font-bold text-xl mb-1">✅ {Object.keys(detailedReasoning.knowledge.green_letters).length}</div>
                  <div className="text-green-300 text-sm font-medium">Confirmed</div>
                </div>
              )}
              
              {/* Yellow Letters Summary */}
              {detailedReasoning.knowledge.yellow_letters.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-xl p-4 text-center border border-yellow-700/30 shadow-lg">
                  <div className="text-yellow-400 font-bold text-xl mb-1">💛 {detailedReasoning.knowledge.yellow_letters.length}</div>
                  <div className="text-yellow-300 text-sm font-medium">In Word</div>
                </div>
              )}
              
              {/* Black Letters Summary */}
              {detailedReasoning.knowledge.black_letters.length > 0 && (
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/40 rounded-xl p-4 text-center border border-gray-600/30 shadow-lg">
                  <div className="text-gray-400 font-bold text-xl mb-1">⚫ {detailedReasoning.knowledge.black_letters.length}</div>
                  <div className="text-gray-400 text-sm font-medium">Ruled Out</div>
                </div>
              )}
            </div>
          )}
          
          {/* Constraints */}
          {detailedReasoning.knowledge?.constraints?.length > 0 && (
            <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-xl p-4 border border-purple-700/30">
              <div className="text-purple-400 font-bold text-sm mb-3 flex items-center">
                <span className="mr-2">🎯</span>
                FOLLOWING RULES
              </div>
              <div className="space-y-2">
                {detailedReasoning.knowledge.constraints.map((constraint, index) => (
                  <div key={index} className="text-gray-300 text-sm flex items-start">
                    <span className="text-purple-400 mr-2 mt-0.5">•</span>
                    <span className="leading-relaxed">{constraint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Fallback to simple reasoning if no detailed data */}
      {!detailedReasoning && reasoning && (
        <div className="bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-xl p-4 border border-gray-600/30">
          <p className="text-gray-300 text-sm italic leading-relaxed">"{reasoning}"</p>
        </div>
      )}
    </div>
  )
}

export default ReasoningBox 