'use client'

import { useState, useEffect } from 'react'
import CmsIllustration from '../content/cms-illustration'
import CmsGamedev from '../content/cms-gamedev'

const CmsInfo = ({ section, onClose, currentLanguage }) => {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleClose = () => {
    onClose()
  }

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

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
        {/* Close button - top-right corner INSIDE content box */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-70"
          aria-label="Close"
          style={{ 
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span className="text-4xl text-gray-600 font-light leading-none">×</span>
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