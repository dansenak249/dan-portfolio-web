'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import vgenIcon from '../assets/vgen-icon.webp'
import vgenColorIcon from '../assets/vgen-color-icon.webp'
import fbIcon from '../assets/fb-icon.webp'
import fbColorIcon from '../assets/fb-color-icon.webp'
import twitterIcon from '../assets/twitter-icon.webp'
import twitterColorIcon from '../assets/twitter-color-icon.webp'
import emailIcon from '../assets/email-icon.webp'
import emailColorIcon from '../assets/email-color-icon.webp'

// Import JSX content component
import ProfileDescription from '../content/profile'

const LeftColumn = ({ currentLanguage, onLanguageChange }) => {
  // --- CONFIGURATION ---
  const JUSTIFY_TEXT = true // Set to true to justify text, false for default alignment
  
  // Width configuration for social icons grid (0.8 = 80%)
  const SOCIAL_WIDTH_PERCENT = 1.0 

  // Spacing configuration (Tailwind classes)
  const SPACING = {
    betweenNameAndHandle: 'mb-1', // Space between "Dan✧" and "@dansenak249"
    betweenHandleAndBio: 'mb-4',  // Space between "@dansenak249" and the description text
    betweenBioAndSocials: 'mt-0', // Space between the description block and social icons
    betweenSocialsAndStatus: 'gap-0' // Space between social icons and the status text
  }

  // Cell padding configuration
  const CELL_CONFIG = {
    paddingLeft: 'pl-8',
    paddingRight: 'pr-2',
    paddingTop: 'pt-2',
    paddingBottom: 'pb-6',
    paddingTopZero: 'pt-0',
    // Social cell bottom padding (reduce on mobile to avoid large gap)
    socialCellPaddingBottom: 'pb-0'
  }

  // Copied notification offset
  const COPIED_TEXT_OFFSET = {
    x: '0px',
    y: '-1px'
  }
  // ---------------------

  const cellsRef = useRef([])
  const [copiedItem, setCopiedItem] = useState(null)

  useEffect(() => {
    // Initial animation for cells
    gsap.fromTo(cellsRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', delay: 0.4 })
  }, [])

  const addToRefs = (el) => {
    if (el && !cellsRef.current.includes(el)) {
      cellsRef.current.push(el)
    }
  }

  // Fallback copy function for mobile/older browsers
  const copyToClipboard = async (text) => {
    // Try modern clipboard API first
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback:', err)
      }
    }

    // Fallback: create temporary textarea
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      
      // Avoid scrolling to bottom
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      // For iOS
      textArea.setSelectionRange(0, 99999)
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      return successful
    } catch (err) {
      console.error('Fallback copy failed:', err)
      return false
    }
  }

  const handleCopyClick = async (e, value, type) => {
    e.preventDefault()
    
    const success = await copyToClipboard(value)
    
    if (success) {
      setCopiedItem(type)
      
      setTimeout(() => {
        setCopiedItem(null)
      }, 2000)
    }
  }

  const CONTENT_OFFSET_TOP = '-mt-4'
  
  const SOCIAL_GRID = {
    iconSize: 'w-7 h-7',
    gap: 'gap-5',
    layout: 'flex-wrap',
    columns: 4
  }

  const socialLinks = [
    { 
      name: 'vgen',
      icon: vgenIcon,
      colorIcon: vgenColorIcon,
      url: 'https://vgen.co/dansenak249',
      external: true
    },
    { 
      name: 'facebook',
      icon: fbIcon,
      colorIcon: fbColorIcon,
      url: 'https://www.facebook.com/dansenak249',
      external: true
    },
    { 
      name: 'twitter',
      icon: twitterIcon,
      colorIcon: twitterColorIcon,
      url: 'https://x.com/dansenak249',
      external: true
    },
    { 
      name: 'email',
      icon: emailIcon,
      colorIcon: emailColorIcon,
      value: 'dan.senak249@gmail.com',
      isCopy: true,
      copyType: 'email'
    }
  ]

  const SocialIcon = ({ social }) => {
    const [isHovered, setIsHovered] = useState(false)

    return social.isCopy ? (
      <button
        onClick={(e) => handleCopyClick(e, social.value, social.copyType)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${SOCIAL_GRID.iconSize} flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer`}
        title={`${social.value} (Click to copy)`}
      >
        <img 
          src={isHovered ? social.colorIcon.src : social.icon.src}
          alt={social.name}
          className="w-full h-full object-contain"
        />
      </button>
    ) : (
      <a
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        href={social.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${SOCIAL_GRID.iconSize} flex items-center justify-center transition-all duration-300 hover:scale-110`}
        title={social.name}
      >
        <img 
          src={isHovered ? social.colorIcon.src : social.icon.src}
          alt={social.name}
          className="w-full h-full object-contain"
        />
      </a>
    )
  }

  return (
    <div className={`flex flex-col gap-0 ${CONTENT_OFFSET_TOP}`}>
      <div ref={addToRefs} className={`bg-white ${CELL_CONFIG.paddingLeft} ${CELL_CONFIG.paddingRight} ${CELL_CONFIG.paddingTop} ${CELL_CONFIG.paddingBottom}`}>
        <h2 className={`text-6xl font-bold text-gradient-blue-pink ${SPACING.betweenNameAndHandle}`}>Dan✧</h2>
        <p className={`text-[#a7a7a7] text-base font-bold ${SPACING.betweenHandleAndBio}`}>@dansenak249</p>
        
        <div className={`text-[#a7a7a7] text-base leading-relaxed ${JUSTIFY_TEXT ? 'text-justify' : 'text-left'}`}>
          <ProfileDescription language={currentLanguage} />
        </div>
      </div>

      <div ref={addToRefs} className={`bg-white ${CELL_CONFIG.paddingLeft} ${CELL_CONFIG.paddingRight} ${CELL_CONFIG.paddingTopZero} ${CELL_CONFIG.socialCellPaddingBottom} relative`}>
        <div className={`flex flex-col ${SPACING.betweenBioAndSocials} ${SPACING.betweenSocialsAndStatus}`}>
          {/* Use inline style to apply the percentage-based max-width */}
          <div 
            className={`flex ${SOCIAL_GRID.layout} ${SOCIAL_GRID.gap}`}
            style={{ maxWidth: `${SOCIAL_WIDTH_PERCENT * 100}%` }}
          >
            {socialLinks.map((social) => (
              <SocialIcon key={social.name} social={social} />
            ))}
          </div>

          <div className="h-2">
            {copiedItem === 'email' && (
              <div 
                className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full animate-fade-in-up"
                style={{ transform: `translate(${COPIED_TEXT_OFFSET.x}, ${COPIED_TEXT_OFFSET.y})` }}
              >
                Email copied! ✓
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeftColumn