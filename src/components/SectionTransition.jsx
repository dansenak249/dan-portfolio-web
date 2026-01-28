import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const SectionTransition = ({ isActive, onFillComplete, onComplete, containerRef }) => {
  const overlayRef = useRef(null)
  const timelineRef = useRef(null)
  const callbacksRef = useRef({ onFillComplete, onComplete })
  
  const GRADIENT_COLORS = ['#b1d5ff', '#C8E6F5', '#ffc4e4']
  const DIRECTIONS = [
    { name: 'left-to-right', origin: 'left center', finalOrigin: 'right center', axis: 'scaleX' },
    { name: 'right-to-left', origin: 'right center', finalOrigin: 'left center', axis: 'scaleX' },
    { name: 'top-to-bottom', origin: 'center top', finalOrigin: 'center bottom', axis: 'scaleY' },
    { name: 'bottom-to-top', origin: 'center bottom', finalOrigin: 'center top', axis: 'scaleY' }
  ]
  
  useEffect(() => {
    callbacksRef.current = { onFillComplete, onComplete }
  }, [onFillComplete, onComplete])
  
  useEffect(() => {
    if (!isActive || !containerRef?.current || !overlayRef.current) {
      return
    }
    
    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
    }
    
    const randomColor = GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)]
    const randomDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
    
    const rect = containerRef.current.getBoundingClientRect()
    
    gsap.killTweensOf(overlayRef.current)
    
    const otherAxis = randomDirection.axis === 'scaleX' ? 'scaleY' : 'scaleX'
    
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
    
    const timeline = gsap.timeline()
    timelineRef.current = timeline
    
    timeline
      .to(overlayRef.current, {
        [randomDirection.axis]: 1,
        duration: 0.2,
        ease: 'power2.inOut',
        onComplete: () => {
          if (callbacksRef.current.onFillComplete) {
            callbacksRef.current.onFillComplete()
          }
        }
      })
      .to({}, { duration: 0.1 })
      .to(overlayRef.current, {
        [randomDirection.axis]: 0,
        transformOrigin: randomDirection.finalOrigin,
        duration: 0.2,
        ease: 'power2.inOut',
        onComplete: () => {
          gsap.set(overlayRef.current, { 
            display: 'none',
            visibility: 'hidden'
          })
          timelineRef.current = null
          if (callbacksRef.current.onComplete) {
            callbacksRef.current.onComplete()
          }
        }
      })
    
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