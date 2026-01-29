import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Navigation from '../../components/Navigation'
import ProfileHeader from './components/ProfileHeader'
import LeftColumn from './components/LeftColumn'
import RightColumn from './components/RightColumn'
import BackToTop from '../../components/BackToTop'
import SectionTransition from '../../components/SectionTransition'
import IllustrationSection from '../Illustration/IllustrationSection'
import GameDevSection from '../GameDev/GameDevSection'
import patternImg1 from './assets/pattern-1.png'
import patternImg2 from './assets/pattern-2.png'

const Landing = ({ activeSection, onSectionChange }) => {
  const containerRef = useRef(null)
  const mainSectionRef = useRef(null)
  const mainBoxRef = useRef(null)
  const overlayRef = useRef(null)
  const pattern1Ref = useRef(null)
  const pattern2Ref = useRef(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentSection, setCurrentSection] = useState('landing')
  const [nextSection, setNextSection] = useState(null)
  const [currentLanguage, setCurrentLanguage] = useState('en')

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
    gap: 'gap-0'
  }

  useEffect(() => {
    gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 })
    
    gsap.to(pattern1Ref.current, {
      backgroundPosition: '200px 200px',
      duration: PATTERN_CONFIG.layer1.speed,
      repeat: -1,
      ease: 'none'
    })
    
    gsap.to(pattern2Ref.current, {
      backgroundPosition: '400px 400px',
      duration: PATTERN_CONFIG.layer2.speed,
      repeat: -1,
      ease: 'none'
    })
  }, [])

  const triggerPageFlip = (callback) => {
    if (isAnimating) return
    setIsAnimating(true)

    const clone = mainSectionRef.current.cloneNode(true)
    overlayRef.current.innerHTML = ''
    overlayRef.current.appendChild(clone)
    
    gsap.set(overlayRef.current, {
      x: 0,
      opacity: 1,
      display: 'block',
      zIndex: 100
    })

    if (callback) {
      callback()
    }

    setTimeout(() => {
      const timeline = gsap.timeline({
        onComplete: () => {
          gsap.set(overlayRef.current, {
            x: 0,
            opacity: 1,
            display: 'none'
          })
          overlayRef.current.innerHTML = ''
          setIsAnimating(false)
        }
      })

      timeline
        .to(overlayRef.current, {
          x: '500px',
          duration: 0.6,
          ease: 'power2.inOut'
        }, 0)
        .to(overlayRef.current, {
          opacity: 0,
          duration: 0.5,
          ease: 'power2.in'
        }, 0.1)
    }, 10)
  }

  const handleSectionChange = (section) => {
    if (section === currentSection || isTransitioning) {
      return
    }
    
    setNextSection(section)
    setIsTransitioning(false)
    
    setTimeout(() => {
      setIsTransitioning(true)
    }, 10)
  }

  const handleFillComplete = () => {
    if (nextSection) {
      setCurrentSection(nextSection)
    }
  }

  const handleTransitionComplete = () => {
    setIsTransitioning(false)
    setNextSection(null)
  }

  const handleLanguageChange = (newLanguage) => {
    setCurrentLanguage(newLanguage)
  }

  useEffect(() => {
    window.triggerPageFlip = triggerPageFlip
    return () => {
      delete window.triggerPageFlip
    }
  }, [isAnimating])

  const renderContent = () => {
    switch (currentSection) {
      case 'illustration':
        return <IllustrationSection />
      case 'gamedev':
        return <GameDevSection />
      case 'placeholder':
        return <PlaceholderSection />
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
                onServiceClick={handleSectionChange}
                currentLanguage={currentLanguage}
              />
            </div>
          </>
        )
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#dadef0] pb-4 relative overflow-hidden">
      <div 
        ref={pattern1Ref}
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${patternImg1})`,
          backgroundRepeat: 'repeat',
          backgroundSize: PATTERN_CONFIG.layer1.size,
          backgroundPosition: '0 0',
          opacity: PATTERN_CONFIG.layer1.opacity,
          zIndex: 1
        }}
      />

      <div 
        ref={pattern2Ref}
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${patternImg2})`,
          backgroundRepeat: 'repeat',
          backgroundSize: PATTERN_CONFIG.layer2.size,
          backgroundPosition: '0 0',
          opacity: PATTERN_CONFIG.layer2.opacity,
          zIndex: 2
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 relative z-10">
        <div className="relative">
          <div 
            className="absolute inset-0 bg-[#b1d5ff] rounded-lg"
            style={{ transform: 'translate(3px, 3px)', zIndex: -1 }}
          />
          
          <div 
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none"
            style={{ 
              display: 'none',
              zIndex: 100
            }}
          />

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
            <SectionTransition 
              isActive={isTransitioning} 
              onFillComplete={handleFillComplete}
              onComplete={handleTransitionComplete}
              containerRef={mainBoxRef}
            />
            
            <Navigation 
              activeSection={activeSection} 
              onSectionChange={() => handleSectionChange('landing')}
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
            />
            
            {renderContent()}

            <div 
              className="h-8"
              style={{ background: 'linear-gradient(90deg, #b1d5ff 0%, #C8E6F5 50%, #ffc4e4 100%)' }}
            />
          </div>
        </div>
      </div>

      <BackToTop />
    </div>
  )
}

export default Landing