import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const SectionTransition = ({ isActive, onFillComplete, onComplete, containerRef }) => {
  const overlayRef = useRef(null)
  const timelineRef = useRef(null)
  const callbacksRef = useRef({ onFillComplete, onComplete })

  // --- CONFIGURATION ---
  const TRANSITION_CONFIG = {
    // Animation timing (in seconds)
    fillDuration: 0.25,      // Time for overlay to fill the screen
    holdDuration: 0.1,       // Time to hold before sliding out
    exitDuration: 0.25,      // Time for overlay to exit
    
    // Easing functions
    fillEase: 'power2.inOut',
    exitEase: 'power2.inOut',
    
    // Available gradient colors (random selection)
    gradientColors: ['#b1d5ff', '#C8E6F5', '#ffc4e4'],
    
    // Available slide directions (random selection)
    directions: [
      { name: 'left-to-right', origin: 'left center', finalOrigin: 'right center', axis: 'scaleX' },
      { name: 'right-to-left', origin: 'right center', finalOrigin: 'left center', axis: 'scaleX' },
      { name: 'top-to-bottom', origin: 'center top', finalOrigin: 'center bottom', axis: 'scaleY' },
      { name: 'bottom-to-top', origin: 'center bottom', finalOrigin: 'center top', axis: 'scaleY' }
    ]
  }
  // ---------------------
  
  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = { onFillComplete, onComplete }
  }, [onFillComplete, onComplete])
  
  // Main transition effect
  useEffect(() => {
    if (!isActive || !containerRef?.current || !overlayRef.current) {
      return
    }
    
    // Kill any existing animation
    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
    }
    
    // Random color and direction selection
    const randomColor = TRANSITION_CONFIG.gradientColors[
      Math.floor(Math.random() * TRANSITION_CONFIG.gradientColors.length)
    ]
    const randomDirection = TRANSITION_CONFIG.directions[
      Math.floor(Math.random() * TRANSITION_CONFIG.directions.length)
    ]
    
    // Get container dimensions
    const rect = containerRef.current.getBoundingClientRect()
    
    // Clean up any existing tweens on overlay
    gsap.killTweensOf(overlayRef.current)
    
    // Determine which axis to animate
    const otherAxis = randomDirection.axis === 'scaleX' ? 'scaleY' : 'scaleX'
    
    // Set initial state
    gsap.set(overlayRef.current, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: rect.width + 'px',
      height: rect.height + 'px',
      display: 'block',
      visibility: 'visible',
      background: randomColor,
      zIndex: 9999,
      [randomDirection.axis]: 0,
      [otherAxis]: 1,
      transformOrigin: randomDirection.origin,
      opacity: 1
    })
    
    // Create animation timeline
    const timeline = gsap.timeline()
    timelineRef.current = timeline
    
    timeline
      // Phase 1: Fill - overlay slides in to cover content
      .to(overlayRef.current, {
        [randomDirection.axis]: 1,
        duration: TRANSITION_CONFIG.fillDuration,
        ease: TRANSITION_CONFIG.fillEase,
        onComplete: () => {
          // Content change happens here (while fully covered)
          if (callbacksRef.current.onFillComplete) {
            callbacksRef.current.onFillComplete()
          }
        }
      })
      // Phase 2: Hold - brief pause while content updates
      .to({}, { duration: TRANSITION_CONFIG.holdDuration })
      // Phase 3: Exit - overlay slides out to reveal new content
      .to(overlayRef.current, {
        [randomDirection.axis]: 0,
        transformOrigin: randomDirection.finalOrigin,
        duration: TRANSITION_CONFIG.exitDuration,
        ease: TRANSITION_CONFIG.exitEase,
        onComplete: () => {
          // Hide overlay and cleanup
          gsap.set(overlayRef.current, { 
            display: 'none',
            visibility: 'hidden'
          })
          timelineRef.current = null
          
          // Notify parent that transition is complete
          if (callbacksRef.current.onComplete) {
            callbacksRef.current.onComplete()
          }
        }
      })
    
    // Cleanup on unmount or when isActive changes
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
        timelineRef.current = null
      }
    }
  }, [isActive])
  
  return (
    <div 
      ref={overlayRef}
      className="pointer-events-none"
      style={{ 
        display: 'none',
        visibility: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        willChange: 'transform'
      }}
    />
  )
}

export default SectionTransition