'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import Navigation from '@/components/Navigation'
import BackToTop from '@/components/BackToTop'
import SectionTransition from '@/components/SectionTransition'
import ProfileHeader from './components/ProfileHeader'
import LeftColumn from './components/LeftColumn'
import RightColumn from './components/RightColumn'
import patternImg1 from './assets/pattern-1.webp'
import patternImg2 from './assets/pattern-2.webp'

export default function CommissionPage({ activeSection, onSectionChange }) {
  const containerRef = useRef(null)
  const mainSectionRef = useRef(null)
  const mainBoxRef = useRef(null)
  const pattern1Ref = useRef(null)
  const pattern2Ref = useRef(null)
  
  // Ref to reset RightColumn tab
  const rightColumnRef = useRef(null)
  
  // State management
  const [isMounted, setIsMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentSection, setCurrentSection] = useState('landing')
  const [nextSection, setNextSection] = useState(null)
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [pendingLanguage, setPendingLanguage] = useState(null)
  
  // Responsive centering state
  const [shouldCenter, setShouldCenter] = useState(false)
  
  // Transition type: 'section' or 'language'
  const [transitionType, setTransitionType] = useState(null)

  // --- CONFIGURATION ---
  const PATTERN_CONFIG = {
    layer1: { speed: 5, opacity: 0.4, size: '200px' },
    layer2: { speed: 8, opacity: 0.6, size: '400px' }
  }

  const LAYOUT_CONFIG = {
    paddingLeft: 'pl-2',
    paddingRight: 'pr-12',
    paddingTop: 'pt-6',
    paddingBottom: 'pb-6',
    marginTop: 'mt-0',
    gap: 'gap-2'
  }

  // Responsive centering animation config
  const CENTERING_CONFIG = {
    transitionDuration: 0.4, // seconds
    ease: 'power2.out',
    checkDebounce: 100 // ms
  }
  // ---------------------

  // Check if content should be centered
  const checkShouldCenter = useCallback(() => {
    if (!mainBoxRef.current || typeof window === 'undefined') return

    const containerHeight = mainBoxRef.current.offsetHeight
    const viewportHeight = window.innerHeight
    const padding = 32 // pt-4 + pb-4 = 32px

    // If container + padding is less than viewport, center it
    const newShouldCenter = (containerHeight + padding) < viewportHeight
    
    if (newShouldCenter !== shouldCenter) {
      setShouldCenter(newShouldCenter)
    }
  }, [shouldCenter])

  // First effect: set mounted
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Second effect: animations after mounted
  useEffect(() => {
    if (!isMounted) return

    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 })
    }
    
    if (pattern1Ref.current) {
      gsap.to(pattern1Ref.current, {
        backgroundPosition: '200px 200px',
        duration: PATTERN_CONFIG.layer1.speed,
        repeat: -1,
        ease: 'none'
      })
    }
    
    if (pattern2Ref.current) {
      gsap.to(pattern2Ref.current, {
        backgroundPosition: '400px 400px',
        duration: PATTERN_CONFIG.layer2.speed,
        repeat: -1,
        ease: 'none'
      })
    }
  }, [isMounted])

  // Responsive centering: check on mount, resize, and content change
  useEffect(() => {
    if (!isMounted) return

    // Initial check after a small delay to ensure content is rendered
    const initialTimer = setTimeout(checkShouldCenter, 100)

    // Debounced resize handler
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(checkShouldCenter, CENTERING_CONFIG.checkDebounce)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(initialTimer)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMounted, checkShouldCenter])

  // Re-check centering when section or language changes
  useEffect(() => {
    if (!isMounted) return
    
    // Small delay to allow content to render
    const timer = setTimeout(checkShouldCenter, 50)
    return () => clearTimeout(timer)
  }, [currentSection, currentLanguage, isMounted, checkShouldCenter])

  // Handle section change
  const handleSectionChange = (section) => {
    // If clicking Home while already on landing, just reset tabs (no transition needed)
    if (section === 'landing' && currentSection === 'landing') {
      if (rightColumnRef.current?.resetToServices) {
        rightColumnRef.current.resetToServices()
      }
      return
    }
    
    // Don't do anything if transitioning
    if (isTransitioning) {
      return
    }
    
    // If navigating to landing from another section, reset tabs after transition
    if (section === 'landing') {
      // Will reset after transition completes
    }
    
    setNextSection(section)
    setTransitionType('section')
    setIsTransitioning(false)
    
    setTimeout(() => {
      setIsTransitioning(true)
    }, 10)
  }

  // Handle language change - NEW: uses SectionTransition
  const handleLanguageChange = (newLanguage) => {
    if (newLanguage === currentLanguage || isTransitioning) {
      return
    }

    setPendingLanguage(newLanguage)
    setTransitionType('language')
    setIsTransitioning(false)
    
    setTimeout(() => {
      setIsTransitioning(true)
    }, 10)
  }

  // Called when transition overlay fully covers the content
  const handleFillComplete = () => {
    if (transitionType === 'section' && nextSection) {
      setCurrentSection(nextSection)
      // Reset tabs when navigating to landing
      if (nextSection === 'landing' && rightColumnRef.current?.resetToServices) {
        rightColumnRef.current.resetToServices()
      }
    } else if (transitionType === 'language' && pendingLanguage) {
      setCurrentLanguage(pendingLanguage)
    }
  }

  // Called when transition animation fully completes
  const handleTransitionComplete = () => {
    setIsTransitioning(false)
    setNextSection(null)
    setPendingLanguage(null)
    setTransitionType(null)
  }

  // Render main content based on current section
  const renderContent = () => {
    switch (currentSection) {
      case 'landing':
      default:
        return (
          <>
            <ProfileHeader />
            <div className={`grid grid-cols-1 lg:grid-cols-[1fr_2fr] ${LAYOUT_CONFIG.gap} ${LAYOUT_CONFIG.paddingLeft} ${LAYOUT_CONFIG.paddingRight} ${LAYOUT_CONFIG.paddingTop} ${LAYOUT_CONFIG.paddingBottom} ${LAYOUT_CONFIG.marginTop}`}>
              <LeftColumn 
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
              />
              <RightColumn 
                ref={rightColumnRef}
                onServiceClick={handleSectionChange}
                currentLanguage={currentLanguage}
              />
            </div>
          </>
        )
    }
  }

  // Show loading during SSR
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#dadef0] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff69b4] mb-4" />
          <p className="text-[#a7a7a7]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className={`min-h-screen bg-[#dadef0] pb-4 relative overflow-hidden flex flex-col ${shouldCenter ? 'justify-center' : 'justify-start'}`}
      style={{
        transition: `all ${CENTERING_CONFIG.transitionDuration}s ${CENTERING_CONFIG.ease.replace('power2.out', 'ease-out')}`
      }}
    >
      {/* Pattern Layer 1 */}
      <div 
        ref={pattern1Ref}
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${patternImg1.src})`,
          backgroundRepeat: 'repeat',
          backgroundSize: PATTERN_CONFIG.layer1.size,
          backgroundPosition: '0 0',
          opacity: PATTERN_CONFIG.layer1.opacity,
          zIndex: 1
        }}
      />

      {/* Pattern Layer 2 */}
      <div 
        ref={pattern2Ref}
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${patternImg2.src})`,
          backgroundRepeat: 'repeat',
          backgroundSize: PATTERN_CONFIG.layer2.size,
          backgroundPosition: '0 0',
          opacity: PATTERN_CONFIG.layer2.opacity,
          zIndex: 2
        }}
      />

      {/* Main Content Container */}
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 ${shouldCenter ? 'py-4' : 'pt-4'} relative z-10`}>
        <div className="relative">
          {/* Shadow Layer */}
          <div 
            className="absolute inset-0 bg-[#b1d5ff] rounded-lg"
            style={{ transform: 'translate(3px, 3px)', zIndex: -1 }}
          />

          {/* Main Box */}
          <div 
            ref={(el) => {
              mainSectionRef.current = el
              mainBoxRef.current = el
            }}
            className="bg-white relative overflow-hidden"
            style={{ 
              boxShadow: '0 20px 60px rgba(75, 0, 130, 0.15)'
            }}
          >
            {/* Section Transition Overlay */}
            <SectionTransition 
              isActive={isTransitioning} 
              onFillComplete={handleFillComplete}
              onComplete={handleTransitionComplete}
              containerRef={mainBoxRef}
            />
            
            {/* Navigation */}
            <Navigation 
              activeSection={activeSection} 
              onSectionChange={() => handleSectionChange('landing')}
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              isTransitioning={isTransitioning}
            />
            
            {/* Page Content */}
            {renderContent()}

            {/* Bottom Gradient Bar */}
            <div 
              className="h-4"
              style={{ background: 'linear-gradient(90deg, #b1d5ff 0%, #C8E6F5 50%, #ffc4e4 100%)' }}
            />
          </div>
        </div>
      </div>

      <BackToTop />
    </div>
  )
}