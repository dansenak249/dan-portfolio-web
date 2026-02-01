'use client'

import { useState, useEffect } from 'react'
import { gsap } from 'gsap'

// Import content components
import CmsIllustration from '../content/CmsIllustration'
import CmsGamedev from '../content/CmsGamedev'

const CmsInfo = ({ section, currentLanguage, onClose }) => {
  useEffect(() => {
    // Animate in
    gsap.fromTo('.cms-info-overlay',
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    )
    
    gsap.fromTo('.cms-info-content',
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
    )
  }, [])

  const handleClose = () => {
    gsap.to('.cms-info-overlay',
      { opacity: 0, duration: 0.2, ease: 'power2.in' }
    )
    
    gsap.to('.cms-info-content',
      { y: 30, opacity: 0, duration: 0.2, ease: 'power2.in',
        onComplete: () => {
          if (onClose) onClose()
        }
      }
    )
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Map section to component
  const ContentComponent = {
    'illustration': CmsIllustration,
    'gamedev': CmsGamedev,
  }[section]

  if (!ContentComponent) {
    return null
  }

  return (
    <div 
      className="cms-info-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={handleClose}
    >
      <div 
        className="cms-info-content relative max-w-4xl w-full max-h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <span className="text-2xl text-gray-600">×</span>
        </button>

        {/* Content - Direct component render, no loading needed! */}
        <div className="overflow-y-auto max-h-[85vh] p-8">
          <ContentComponent language={currentLanguage} />
        </div>
      </div>
    </div>
  )
}

export default CmsInfo