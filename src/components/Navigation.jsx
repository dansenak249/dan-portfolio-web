import { useState, useRef, useEffect } from 'react'
import homeIcon from '../sections/Landing/assets/home-icon.png'
import languageIcon from '../sections/Landing/assets/language-icon.png'
import vnFlag from '../sections/Landing/assets/vn-flag.png'
import usFlag from '../sections/Landing/assets/us-flag.png'

const Navigation = ({ activeSection, onSectionChange, currentLanguage, onLanguageChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const LANGUAGE_CONFIG = {
    dropdownBgColor: '#ffffff',
    dropdownTextColor: '#666666',
    dropdownHoverBgColor: 'rgba(147, 197, 253, 0.2)'
  }

  const languages = [
    { 
      code: 'vi', 
      name: 'Tiếng Việt', 
      shortCode: 'VN',
      flag: vnFlag
    },
    { 
      code: 'en', 
      name: 'English', 
      shortCode: 'US',
      flag: usFlag
    }
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleLanguageSelect = (langCode) => {
    if (langCode === currentLanguage) {
      setIsDropdownOpen(false)
      return
    }

    setIsDropdownOpen(false)

    if (window.triggerPageFlip) {
      window.triggerPageFlip(() => {
        if (onLanguageChange) {
          onLanguageChange(langCode)
        }
      })
    } else {
      if (onLanguageChange) {
        onLanguageChange(langCode)
      }
    }
  }

  return (
    <nav className="h-[60px] bg-white border-b-2 border-[#efefef]">
      <div className="px-2 h-full flex items-center justify-between">
        <button
          onClick={() => onSectionChange('landing')}
          className="flex items-center gap-4 px-6 py-0 h-full hover:scale-105 transition-transform duration-300 rounded-xl bg-white"
        >
          <img 
            src={homeIcon} 
            alt="Home"
            className="h-[45px] aspect-square object-contain"
          />
          <span className="text-3xl font-bold text-[#b7e7fb]">
            Home
          </span>
        </button>

        <div className="relative mr-4" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-[45px] w-[45px] rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300"
          >
            <img 
              src={languageIcon} 
              alt="Language"
              className="w-full h-full object-contain"
            />
          </button>

          {isDropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-48 rounded-lg overflow-hidden z-50"
              style={{
                backgroundColor: LANGUAGE_CONFIG.dropdownBgColor
              }}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200"
                  style={{
                    color: LANGUAGE_CONFIG.dropdownTextColor,
                    backgroundColor: currentLanguage === lang.code 
                      ? LANGUAGE_CONFIG.dropdownHoverBgColor 
                      : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentLanguage !== lang.code) {
                      e.currentTarget.style.backgroundColor = LANGUAGE_CONFIG.dropdownHoverBgColor
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentLanguage !== lang.code) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={lang.flag} 
                      alt={lang.shortCode}
                      className="w-6 h-6 object-cover rounded"
                    />
                    <span className="text-sm font-bold">{lang.shortCode}</span>
                  </div>
                  <span className="text-sm font-medium">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation