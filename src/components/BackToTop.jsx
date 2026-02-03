import { useState, useEffect } from 'react'

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled down 300px
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    // Smooth scroll to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#4A90E2] to-[#FFB5C5] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer"
      title="Back to Top"
    >
      {/* Using SVG instead of text arrow for perfect centering.
        The 'stroke-width' and 'size' can be adjusted easily.
      */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="28" 
        height="28" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="m18 15-6-6-6 6"/>
      </svg>
    </button>
  )
}

export default BackToTop