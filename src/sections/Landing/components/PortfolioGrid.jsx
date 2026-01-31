import { useState, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'

// Import loading assets eagerly (load immediately on page load)
import loadingPlaceholder from '../assets/Samples/loading-placeholder.png'
import loadingGif from '../assets/Samples/loading.gif'

const PortfolioGrid = () => {
  const [portfolioItems, setPortfolioItems] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [isLoadingFull, setIsLoadingFull] = useState(false)
  const [loadedFullImages, setLoadedFullImages] = useState(new Map())
  const [loadingGifReady, setLoadingGifReady] = useState(false)
  const [currentLoadingImage, setCurrentLoadingImage] = useState(loadingPlaceholder)

  // ===========================================
  // LOADING BOX CONFIGURATION
  // ===========================================
  const LOADING_CONFIG = {
    // Minimum loading time in milliseconds (set to 0 for production)
    minLoadTime: 0,
    // Box settings
    box: {
      width: '250px',
      height: '250px',
      backgroundColor: '#ffffff',
      borderRadius: '8px'
    },
    // Loading image/gif settings (square)
    image: {
      size: '225px',
      borderRadius: '0px',
      offsetX: '0px', 
      offsetY: '0px'  // NEW: Distance from the TOP edge of the box
    },
    // Loading text settings
    text: {
      content: 'Loading...',
      fontSize: '16px',
      color: '#a7a7a7',
      offsetX: '0px',
      offsetY: '-8px' // Distance from the BOTTOM edge of the box
    }
  }
  // ===========================================

  const GRID_CONFIG = {
    columns: 'grid-cols-2',
    gap: 'gap-4',
    backgroundColor: '#ffffff',
    thumbSize: 'aspect-square',
    thumbRounded: 'rounded-lg',
    thumbHoverScale: 'hover:scale-105',
    thumbTransition: 'transition-all duration-300'
  }

  // Lazy import function for full images
  const fullImageImports = import.meta.glob('../assets/Samples/*-full.{png,jpg,jpeg}')

  // Preload loading gif on mount
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setLoadingGifReady(true)
      setCurrentLoadingImage(loadingGif)
    }
    img.onerror = () => {
      setLoadingGifReady(false)
    }
    img.src = loadingGif
  }, [])

  useEffect(() => {
    const loadPortfolioImages = () => {
      // Only eager load thumbnails (small files)
      const thumbnails = import.meta.glob('../assets/Samples/*-thumb.{png,jpg,jpeg}', { eager: true })
      
      const imageMap = new Map()
      
      // Process thumbnails
      Object.entries(thumbnails).forEach(([path, module]) => {
        const filename = path.split('/').pop()
        const nameMatch = filename.match(/^(.+)-thumb\.(png|jpg|jpeg)$/i)
        
        if (nameMatch) {
          const [, name] = nameMatch
          // Skip loading assets
          if (name === 'loading' || name === 'loading-placeholder') return
          
          imageMap.set(name, {
            name,
            thumbnail: module.default,
            // Store the path pattern for lazy loading full image later
            fullImagePath: path.replace('-thumb.', '-full.')
          })
        }
      })
      
      const items = Array.from(imageMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
      
      setPortfolioItems(items)
    }

    loadPortfolioImages()
  }, [])

  // Function to load full image on demand
  const loadFullImage = useCallback(async (item) => {
    // Check if already cached
    if (loadedFullImages.has(item.name)) {
      return loadedFullImages.get(item.name)
    }

    // Find the matching import function
    const importKey = Object.keys(fullImageImports).find(key => 
      key.includes(`${item.name}-full.`)
    )

    if (importKey) {
      try {
        const module = await fullImageImports[importKey]()
        const fullImageUrl = module.default
        
        // Cache the loaded image
        setLoadedFullImages(prev => new Map(prev).set(item.name, fullImageUrl))
        
        return fullImageUrl
      } catch (error) {
        console.error(`Failed to load full image for ${item.name}:`, error)
        return null
      }
    }
    
    return null
  }, [fullImageImports, loadedFullImages])

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

  const openPopup = async (item) => {
    setSelectedImage({ ...item, fullImage: null })
    setIsPopupOpen(true)
    setIsLoadingFull(true)
    
    // Record start time for minimum load time
    const loadStartTime = Date.now()
    
    // Animate popup open
    gsap.fromTo('.portfolio-popup-overlay', 
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    )
    
    gsap.fromTo('.portfolio-popup-content',
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)', delay: 0.1 }
    )

    // Load full image on demand
    const fullImageUrl = await loadFullImage(item)
    
    if (fullImageUrl) {
      // Preload the image before displaying
      const img = new Image()
      img.onload = async () => {
        // Calculate elapsed time
        const elapsedTime = Date.now() - loadStartTime
        const remainingTime = LOADING_CONFIG.minLoadTime - elapsedTime
        
        // Wait for minimum load time if needed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        setSelectedImage(prev => ({ ...prev, fullImage: fullImageUrl }))
        setIsLoadingFull(false)
      }
      img.onerror = async () => {
        console.error('Failed to load image')
        
        // Still respect minimum load time on error
        const elapsedTime = Date.now() - loadStartTime
        const remainingTime = LOADING_CONFIG.minLoadTime - elapsedTime
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        setIsLoadingFull(false)
      }
      img.src = fullImageUrl
    } else {
      // Still respect minimum load time even if no image found
      const elapsedTime = Date.now() - loadStartTime
      const remainingTime = LOADING_CONFIG.minLoadTime - elapsedTime
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      setIsLoadingFull(false)
    }
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
          setIsLoadingFull(false)
        }
      }
    )
  }

  // Loading Box Component
  const LoadingBox = () => (
    <div 
      // Changed: 'justify-start' aligns items to the top (flex-start)
      // 'relative' is kept for absolute positioning of the text
      className="relative flex flex-col items-center justify-start"
      style={{
        width: LOADING_CONFIG.box.width,
        height: LOADING_CONFIG.box.height,
        backgroundColor: LOADING_CONFIG.box.backgroundColor,
        borderRadius: LOADING_CONFIG.box.borderRadius
      }}
    >
      {/* Loading character image/gif */}
      <div 
        className="overflow-hidden flex-shrink-0"
        style={{
          width: LOADING_CONFIG.image.size,
          height: LOADING_CONFIG.image.size,
          borderRadius: LOADING_CONFIG.image.borderRadius,
          // NEW: Transform relative to the top-center position
          // Using translateY with a positive value pushes it down from the top
          transform: `translate(${LOADING_CONFIG.image.offsetX}, ${LOADING_CONFIG.image.offsetY})`
        }}
      >
        <img
          src={currentLoadingImage}
          alt="Loading..."
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Loading text (Anchored to Bottom) */}
      <p 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          textAlign: 'center',
          
          fontSize: LOADING_CONFIG.text.fontSize,
          color: LOADING_CONFIG.text.color,
          // Offsets for text (relative to bottom position)
          transform: `translate(${LOADING_CONFIG.text.offsetX}, ${LOADING_CONFIG.text.offsetY})`
        }}
      >
        {LOADING_CONFIG.text.content}
      </p>
    </div>
  )

  if (portfolioItems.length === 0) {
    return (
      <div className="p-8 min-h-[300px] flex items-center justify-center" style={{ backgroundColor: GRID_CONFIG.backgroundColor }}>
        <p className="text-[#a7a7a7] text-lg">
          No sample images found. Add images to sections/Landing/assets/Samples/
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
              ) : selectedImage.fullImage ? (
                <img
                  src={selectedImage.fullImage}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[85vh] w-auto h-auto rounded-lg"
                />
              ) : (
                // Fallback to thumbnail if full image failed to load
                <img
                  src={selectedImage.thumbnail}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[85vh] w-auto h-auto rounded-lg"
                />
              )}
            </div>

            <p className="text-white text-center mt-4 text-sm opacity-70">
              
            </p>
          </div>
        </div>
      )}

      {/* Thay <style jsx> thành <style> thường */}
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