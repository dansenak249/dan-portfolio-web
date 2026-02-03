import { useState, useEffect, useRef } from 'react'
import homeIcon from '@/app/commission/assets/home-icon.webp'
import languageIcon from '@/app/commission/assets/language-icon.webp'

const Navigation = ({ activeSection, onSectionChange, currentLanguage, onLanguageChange, isTransitioning }) => {
  const toggleRef = useRef(null)
  
  // Track the visual state of toggle (delayed from actual currentLanguage)
  const [visualLanguage, setVisualLanguage] = useState(currentLanguage)
  
  // Update visual language after transition completes
  useEffect(() => {
    if (!isTransitioning && currentLanguage !== visualLanguage) {
      setVisualLanguage(currentLanguage)
    }
  }, [isTransitioning, currentLanguage, visualLanguage])

  // --- CONFIGURATION ---
  const TOGGLE_CONFIG = {
    // Overall scale (1.0 = 100%, 0.8 = 80%, 1.2 = 120%, etc.)
    scale: 1.0,
    
    // Gap between icon and toggle box
    iconToggleGap: '8px',
    
    // Icon settings (outside toggle)
    iconSize: '20px',
    iconOpacity: 0.7,
    
    // Toggle container
    containerBgColor: '#f5f5ff',
    containerBorderRadius: '8px',
    containerPadding: '4px',
    
    // Toggle items
    itemPaddingX: '12px',
    itemPaddingY: '6px',
    itemBorderRadius: '6px',
    itemFontSize: '14px',
    itemFontWeight: '600',
    
    // Text offset adjustment (for font alignment)
    textOffsetX: '0px',
    textOffsetY: '-1px',
    
    // Colors
    activeTextColor: '#39327f',
    inactiveTextColor: '#999999',
    activeBgColor: '#ffffff',
    
    // Animation
    transitionDuration: '0.25s',
    
    // Shadow for active item
    activeShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  }
  // ---------------------

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'vi', label: 'VN' }
  ]

  const handleLanguageSelect = (langCode) => {
    if (langCode === currentLanguage) {
      return
    }

    if (onLanguageChange) {
      onLanguageChange(langCode)
    }
  }

  // Calculate background slider position (uses visualLanguage for delayed animation)
  const getSliderStyle = () => {
    const activeIndex = languages.findIndex(lang => lang.code === visualLanguage)
    const itemCount = languages.length
    
    return {
      width: `calc(${100 / itemCount}% - ${parseInt(TOGGLE_CONFIG.containerPadding) / 2}px)`,
      transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * parseInt(TOGGLE_CONFIG.containerPadding)}px))`,
      transition: `transform ${TOGGLE_CONFIG.transitionDuration} ease-out`
    }
  }

  return (
    <nav className="h-[45px] bg-white border-b-2 border-[#efefef]">
      <div className="px-3 h-full flex items-center justify-between">
        {/* Home Button */}
        <button
          onClick={() => onSectionChange('landing')}
          className="flex items-center gap-4 px-6 py-0 h-full hover:scale-105 transition-transform duration-300 rounded-xl bg-white"
        >
          <img 
            src={homeIcon.src} 
            alt="Home"
            className="h-[35px] aspect-square object-contain"
          />
        </button>

        {/* Language Toggle Wrapper - with scale */}
        <div 
          className="flex items-center mr-4"
          style={{
            transform: `scale(${TOGGLE_CONFIG.scale})`,
            transformOrigin: 'right center',
            gap: TOGGLE_CONFIG.iconToggleGap
          }}
        >
          {/* Language Icon (outside toggle) */}
          <img 
            src={languageIcon.src} 
            alt="Language"
            style={{ 
              width: TOGGLE_CONFIG.iconSize,
              height: TOGGLE_CONFIG.iconSize,
              opacity: TOGGLE_CONFIG.iconOpacity,
              objectFit: 'contain'
            }}
          />

          {/* Toggle Box */}
          <div 
            ref={toggleRef}
            className="flex items-center"
            style={{
              backgroundColor: TOGGLE_CONFIG.containerBgColor,
              borderRadius: TOGGLE_CONFIG.containerBorderRadius,
              padding: TOGGLE_CONFIG.containerPadding
            }}
          >
            {/* Toggle Buttons Container */}
            <div className="relative flex items-center">
              {/* Sliding Background */}
              <div 
                className="absolute top-0 left-0 h-full pointer-events-none"
                style={{
                  ...getSliderStyle(),
                  backgroundColor: TOGGLE_CONFIG.activeBgColor,
                  borderRadius: TOGGLE_CONFIG.itemBorderRadius,
                  boxShadow: TOGGLE_CONFIG.activeShadow
                }}
              />

              {/* Toggle Buttons */}
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="relative z-10 cursor-pointer select-none"
                  style={{
                    padding: `${TOGGLE_CONFIG.itemPaddingY} ${TOGGLE_CONFIG.itemPaddingX}`,
                    borderRadius: TOGGLE_CONFIG.itemBorderRadius,
                    fontSize: TOGGLE_CONFIG.itemFontSize,
                    fontWeight: TOGGLE_CONFIG.itemFontWeight,
                    color: visualLanguage === lang.code 
                      ? TOGGLE_CONFIG.activeTextColor 
                      : TOGGLE_CONFIG.inactiveTextColor,
                    transition: `color ${TOGGLE_CONFIG.transitionDuration} ease-out`,
                    background: 'transparent'
                  }}
                >
                  <span style={{ 
                    display: 'inline-block',
                    transform: `translate(${TOGGLE_CONFIG.textOffsetX}, ${TOGGLE_CONFIG.textOffsetY})`
                  }}>
                    {lang.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation