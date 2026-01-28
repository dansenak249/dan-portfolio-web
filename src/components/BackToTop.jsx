import { useState, useEffect } from 'react'

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#4A90E2] to-[#FFB5C5] text-white text-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300"
      title="Back to Top"
    >
      ↑
    </button>
  )
}

export default BackToTop