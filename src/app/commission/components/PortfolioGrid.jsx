'use client'

import { useState, useEffect } from 'react'
import { gsap } from 'gsap'

// Import loading assets from src (these are bundled)
import loadingPlaceholder from '../assets/samples/loading-placeholder.png'
import loadingGif from '../assets/samples/loading.gif'

const PortfolioGrid = () => {
  const [isMounted, setIsMounted] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isLoadingFull, setIsLoadingFull] = useState(false)
  const [loadedFullImages, setLoadedFullImages] = useState(new Map())
  const [loadingGifReady, setLoadingGifReady] = useState(false)
  const [currentLoadingImage, setCurrentLoadingImage] = useState(loadingPlaceholder.src)

  // Set mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ===========================================
  // LOADING BOX CONFIGURATION
  // ===========================================
  const LOADING_CONFIG = {
    minLoadTime: 0,
    box: {
      width: '250px',
      height: '250px',
      backgroundColor: '#ffffff',
      borderRadius: '8px'
    },
    image: {
      size: '225px',
      borderRadius: '0px',
      offsetX: '0px', 
      offsetY: '0px'
    },
    text: {
      content: 'Loading...',
      fontSize: '16px',
      color: '#a7a7a7',
      offsetX: '0px',
      offsetY: '-8px'
    }
  }

  const GRID_CONFIG = {
    columns: 'grid-cols-2',
    gap: 'gap-4',
    backgroundColor: '#ffffff',
    thumbSize: 'aspect-square',
    thumbRounded: 'rounded-lg',
    thumbHoverScale: 'hover:scale-105',
    thumbTransition: 'transition-all duration-300'
  }

  // Preload loading gif on mount
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setLoadingGifReady(true)
      setCurrentLoadingImage(loadingGif.src)
    }
    img.onerror = () => {
      setLoadingGifReady(false)
    }
    img.src = loadingGif.src
  }, [])

  // Auto-discover images from public/commission/samples folder
  useEffect(() => {
    const loadPortfolioImages = async () => {
      try {
        // Fetch the samples manifest
        const response = await fetch('/commission/samples/manifest.json')
        if (!response.ok) {
          console.error('Failed to load samples manifest')
          setPortfolioItems([])
          return
        }

        const manifest = await response.json()
        
        // Filter and process images
        const items = manifest.files
          .filter(filename => filename.match(/-thumb\.(png|jpg|jpeg)$/i))
          .map(filename => {
            const nameMatch = filename.match(/^(.+)-thumb\.(png|jpg|jpeg)$/i)
            if (nameMatch) {
              const [, name, ext] = nameMatch
              if (name === 'loading' || name === 'loading-placeholder') return null
              
              return {
                name,
                thumbnail: `/commission/samples/${filename}`,
                fullImage: `/commission/samples/${name}-full.${ext}`
              }
            }
            return null
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name))
        
        setPortfolioItems(items)
      } catch (error) {
        console.error('Failed to load portfolio images:', error)
        setPortfolioItems([])
      }
    }

    loadPortfolioImages()
  }, [])

  const loadFullImage = async (item) => {
    if (loadedFullImages.has(item.name)) {
      return loadedFullImages.get(item.name)
    }

    // Check if full image exists
    try {
      const response = await fetch(item.fullImage, { method: 'HEAD' })
      if (response.ok) {
        setLoadedFullImages(prev => new Map(prev).set(item.name, item.fullImage))
        return item.fullImage
      }
    } catch (error) {
      console.warn(`Full image not found for ${item.name}, using thumbnail`)
    }
    
    return null
  }

  useEffect(() => {
    if (!isMounted) return

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
  }, [isMounted, isPopupOpen])

  const openPopup = async (item) => {
    setSelectedImage({ ...item, fullImageLoaded: null })
    setIsPopupOpen(true)
    setIsLoadingFull(true)
    
    const loadStartTime = Date.now()
    
    // Wait for DOM then animate
    requestAnimationFrame(() => {
      const overlay = document.querySelector('.portfolio-popup-overlay')
      const content = document.querySelector('.portfolio-popup-content')
      
      if (overlay && content) {
        gsap.fromTo(overlay, 
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' }
        )
        
        gsap.fromTo(content,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.1 }
        )
      }
    })

    const fullImageUrl = await loadFullImage(item)
    
    if (fullImageUrl) {
      const img = new Image()
      img.onload = async () => {
        const elapsedTime = Date.now() - loadStartTime
        const remainingTime = LOADING_CONFIG.minLoadTime - elapsedTime
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        setSelectedImage(prev => ({ ...prev, fullImageLoaded: fullImageUrl }))
        setIsLoadingFull(false)
      }
      img.onerror = async () => {
        console.error('Failed to load full image')
        
        const elapsedTime = Date.now() - loadStartTime
        const remainingTime = LOADING_CONFIG.minLoadTime - elapsedTime
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        setIsLoadingFull(false)
      }
      img.src = fullImageUrl
    } else {
      const elapsedTime = Date.now() - loadStartTime
      const remainingTime = LOADING_CONFIG.minLoadTime - elapsedTime
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      setIsLoadingFull(false)
    }
  }

  const closePopup = () => {
    const overlay = document.querySelector('.portfolio-popup-overlay')
    const content = document.querySelector('.portfolio-popup-content')
    
    if (overlay && content) {
      gsap.to(overlay,
        { opacity: 0, duration: 0.2, ease: 'power2.in' }
      )
      
      gsap.to(content,
        { scale: 0.8, opacity: 0, duration: 0.2, ease: 'power2.in',
          onComplete: () => {
            setIsPopupOpen(false)
            setSelectedImage(null)
            setIsLoadingFull(false)
          }
        }
      )
    } else {
      setIsPopupOpen(false)
      setSelectedImage(null)
      setIsLoadingFull(false)
    }
  }

  const LoadingBox = () => (
    <div 
      className="relative flex flex-col items-center justify-start"
      style={{
        width: LOADING_CONFIG.box.width,
        height: LOADING_CONFIG.box.height,
        backgroundColor: LOADING_CONFIG.box.backgroundColor,
        borderRadius: LOADING_CONFIG.box.borderRadius
      }}
    >
      <div 
        className="overflow-hidden flex-shrink-0"
        style={{
          width: LOADING_CONFIG.image.size,
          height: LOADING_CONFIG.image.size,
          borderRadius: LOADING_CONFIG.image.borderRadius,
          transform: `translate(${LOADING_CONFIG.image.offsetX}, ${LOADING_CONFIG.image.offsetY})`
        }}
      >
        <img
          src={currentLoadingImage}
          alt="Loading..."
          className="w-full h-full object-cover"
        />
      </div>
      
      <p 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          textAlign: 'center',
          fontSize: LOADING_CONFIG.text.fontSize,
          color: LOADING_CONFIG.text.color,
          transform: `translate(${LOADING_CONFIG.text.offsetX}, ${LOADING_CONFIG.text.offsetY})`
        }}
      >
        {LOADING_CONFIG.text.content}
      </p>
    </div>
  )

  if (!isMounted) {
    return (
      <div className="p-8 min-h-[300px] flex items-center justify-center" style={{ backgroundColor: GRID_CONFIG.backgroundColor }}>
        <p className="text-[#a7a7a7] text-lg">Loading samples...</p>
      </div>
    )
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="p-8 min-h-[300px] flex items-center justify-center" style={{ backgroundColor: GRID_CONFIG.backgroundColor }}>
        <p className="text-[#a7a7a7] text-lg">
          No sample images found. Add images to public/commission/samples/ and run: node generate-samples-manifest.js
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

            <div className="relative overflow-hidden shadow-2xl flex items-center justify-center">
              {isLoadingFull ? (
                <LoadingBox />
              ) : selectedImage.fullImageLoaded ? (
                <img
                  src={selectedImage.fullImageLoaded}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[85vh] w-auto h-auto rounded-lg"
                />
              ) : (
                <img
                  src={selectedImage.thumbnail}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[85vh] w-auto h-auto rounded-lg"
                />
              )}
            </div>

            <p className="text-white text-center mt-4 text-sm opacity-70">
              {selectedImage.name}
            </p>
          </div>
        </div>
      )}

      <style>{`
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