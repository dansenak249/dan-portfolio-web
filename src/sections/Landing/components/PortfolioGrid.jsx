import { useState, useEffect } from 'react'
import { gsap } from 'gsap'

const PortfolioGrid = () => {
  const [portfolioItems, setPortfolioItems] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const GRID_CONFIG = {
    columns: 'grid-cols-2',
    gap: 'gap-4',
    backgroundColor: '#ffffff',
    thumbSize: 'aspect-square',
    thumbRounded: 'rounded-lg',
    thumbHoverScale: 'hover:scale-105',
    thumbTransition: 'transition-all duration-300'
  }

  useEffect(() => {
    const loadPortfolioImages = () => {
      const images = import.meta.glob('../assets/Portfolio/*.{png,jpg,jpeg}', { eager: true })
      
      const imageMap = new Map()
      
      Object.entries(images).forEach(([path, module]) => {
        const filename = path.split('/').pop()
        const nameMatch = filename.match(/^(.+)-(thumb|full)\.(png|jpg|jpeg)$/i)
        
        if (nameMatch) {
          const [, name, type] = nameMatch
          
          if (!imageMap.has(name)) {
            imageMap.set(name, { name })
          }
          
          const item = imageMap.get(name)
          if (type === 'thumb') {
            item.thumbnail = module.default
          } else if (type === 'full') {
            item.fullImage = module.default
          }
        }
      })
      
      const items = Array.from(imageMap.values())
        .filter(item => item.thumbnail && item.fullImage)
        .sort((a, b) => a.name.localeCompare(b.name))
      
      setPortfolioItems(items)
    }

    loadPortfolioImages()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPopupOpen) {
        closePopup()
      }
    }

    if (isPopupOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isPopupOpen])

  const openPopup = (item) => {
    setSelectedImage(item)
    setIsPopupOpen(true)
    
    gsap.fromTo('.portfolio-popup-overlay', 
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    )
    
    gsap.fromTo('.portfolio-popup-content',
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.1 }
    )
  }

  const closePopup = () => {
    gsap.to('.portfolio-popup-overlay',
      { opacity: 0, duration: 0.2, ease: 'power2.in' }
    )
    
    gsap.to('.portfolio-popup-content',
      { scale: 0.8, opacity: 0, duration: 0.2, ease: 'power2.in',
        onComplete: () => {
          setIsPopupOpen(false)
          setSelectedImage(null)
        }
      }
    )
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="p-8 min-h-[300px] flex items-center justify-center" style={{ backgroundColor: GRID_CONFIG.backgroundColor }}>
        <p className="text-[#a7a7a7] text-lg">
          No portfolio images found. Add images to sections/Landing/assets/Portfolio/
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="p-6" style={{ backgroundColor: GRID_CONFIG.backgroundColor }}>
        <div className={`grid ${GRID_CONFIG.columns} ${GRID_CONFIG.gap}`}>
          {portfolioItems.map((item, index) => (
            <button
              key={item.name}
              onClick={() => openPopup(item)}
              className={`${GRID_CONFIG.thumbSize} ${GRID_CONFIG.thumbRounded} ${GRID_CONFIG.thumbHoverScale} ${GRID_CONFIG.thumbTransition} overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff69b4] focus:ring-offset-2`}
              style={{
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards`
              }}
            >
              <img
                src={item.thumbnail}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {isPopupOpen && selectedImage && (
        <div 
          className="portfolio-popup-overlay fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80"
          onClick={closePopup}
        >
          <div 
            className="portfolio-popup-content relative max-w-[90vw] max-h-[90vh] w-auto h-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePopup}
              className="absolute -top-12 right-0 text-white text-4xl font-light hover:text-[#ff69b4] transition-colors duration-200 z-10"
              aria-label="Close popup"
            >
              ×
            </button>

            <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl">
              <img
                src={selectedImage.fullImage}
                alt={selectedImage.name}
                className="max-w-full max-h-[90vh] w-auto h-auto"
              />
            </div>

            <p className="text-white text-center mt-4 text-sm opacity-70">
              Press ESC or click outside to close
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}

export default PortfolioGrid