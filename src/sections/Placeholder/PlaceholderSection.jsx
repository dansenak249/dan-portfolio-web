const PlaceholderSection = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gradient-blue-pink mb-6">Placeholder</h1>
      <div className="space-y-4">
        <p className="text-[#a7a7a7] text-lg">
          This is a placeholder section.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center"
            >
              <span className="text-4xl font-bold text-purple-400">?</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PlaceholderSection