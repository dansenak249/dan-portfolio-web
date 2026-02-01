'use client'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#dadef0] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#af83b9] mb-4">Profile Page</h1>
        <p className="text-[#a7a7a7]">Coming soon... ✨</p>
        <a 
          href="/commission"
          className="inline-block mt-6 px-6 py-2 bg-gradient-to-r from-[#ff69b4] to-[#ffcc00] text-white rounded-full hover:scale-105 transition-transform"
        >
          Back to Commission
        </a>
      </div>
    </div>
  )
}