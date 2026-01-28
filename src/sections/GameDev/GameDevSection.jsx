const GameDevSection = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gradient-blue-pink mb-6">Game Development</h1>
      <div className="space-y-4">
        <p className="text-[#a7a7a7] text-lg">
          This is the GameDev section placeholder.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center"
            >
              <span className="text-4xl font-bold text-blue-400">#{i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GameDevSection