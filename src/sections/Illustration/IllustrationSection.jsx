const IllustrationSection = () => {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gradient-blue-pink mb-6">Animated Illustrations</h1>
      <div className="space-y-4">
        <p className="text-[#a7a7a7] text-lg">
          This is the Illustration section placeholder.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center"
            >
              <span className="text-4xl font-bold text-pink-400">#{i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IllustrationSection