'use client'

export default function HandbookPage() {
  return (
    <div className="min-h-screen bg-[#dadef0] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#7978e6] mb-4">Handbook Page</h1>
        <p className="text-[#a7a7a7]">Coming soon... 📚</p>
        <a 
          href="/commission"
          className="inline-block mt-6 px-6 py-2 bg-gradient-to-r from-[#7978e6] to-[#e99bba] text-white rounded-full hover:scale-105 transition-transform"
        >
          Back to Commission
        </a>
      </div>
    </div>
  )
}