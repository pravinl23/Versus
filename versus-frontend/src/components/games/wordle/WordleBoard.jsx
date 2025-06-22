import Tile from './Tile'

const WordleBoard = ({ guesses, feedback, isWinner }) => {
  // Create a 6x5 grid for better visual consistency
  const rows = []
  const maxRows = 6
  
  // Add completed guesses
  for (let i = 0; i < Math.min(guesses.length, maxRows); i++) {
    const guess = guesses[i]
    const fb = feedback[i]
    const tiles = []
    
    for (let j = 0; j < 5; j++) {
      tiles.push(
        <Tile 
          key={`${i}-${j}`}
          letter={guess[j]}
          status={fb[j]}
          delay={i * 0.2 + j * 0.1} // Smoother animation timing
        />
      )
    }
    
    rows.push(
      <div key={i} className="flex gap-2 justify-center">
        {tiles}
      </div>
    )
  }
  
  // Add empty rows to fill up to 6 rows for consistent layout
  const remainingRows = maxRows - Math.min(guesses.length, maxRows)
  for (let i = 0; i < remainingRows; i++) {
    const tiles = []
    for (let j = 0; j < 5; j++) {
      tiles.push(
        <Tile 
          key={`empty-${i}-${j}`}
          letter=""
          status="empty"
        />
      )
    }
    
    rows.push(
      <div key={`empty-row-${i}`} className="flex gap-2 justify-center">
        {tiles}
      </div>
    )
  }
  
  return (
    <div className={`
      p-8 rounded-2xl backdrop-blur-sm
      ${isWinner ? 'bg-gradient-to-br from-green-900/20 to-green-800/20 border-2 border-green-400/50 shadow-2xl shadow-green-400/20' : 'bg-gray-900/50 border border-gray-700/50'}
      transition-all duration-1000 ease-out
      shadow-xl
    `}>
      <div className="flex flex-col gap-2">
        {rows}
      </div>
      
      {/* Show overflow indicator if there are more than 6 guesses */}
      {guesses.length > maxRows && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800/80 text-gray-400 text-sm">
            <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
            +{guesses.length - maxRows} more guesses
          </div>
        </div>
      )}
    </div>
  )
}

export default WordleBoard 