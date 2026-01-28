import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import vgenIcon from '../assets/vgen-icon.png'
import vgenColorIcon from '../assets/vgen-color-icon.png'
import fbIcon from '../assets/fb-icon.png'
import fbColorIcon from '../assets/fb-color-icon.png'
import twitterIcon from '../assets/twitter-icon.png'
import twitterColorIcon from '../assets/twitter-color-icon.png'
import emailIcon from '../assets/email-icon.png'
import emailColorIcon from '../assets/email-color-icon.png'
import discordIcon from '../assets/discord-icon.png'
import discordColorIcon from '../assets/discord-color-icon.png'
import vnFlag from '../assets/vn-flag.png'
import usFlag from '../assets/us-flag.png'
import profileDescriptionEnTxt from '../assets/Text/profile-description-en.txt?raw'
import profileDescriptionViTxt from '../assets/Text/profile-description-vi.txt?raw'

const LeftColumn = ({ currentLanguage, onLanguageChange }) => {
  const cellsRef = useRef([])
  const [copiedItem, setCopiedItem] = useState(null)

  useEffect(() => {
    gsap.fromTo(cellsRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', delay: 0.4 })
  }, [])

  const addToRefs = (el) => {
    if (el && !cellsRef.current.includes(el)) {
      cellsRef.current.push(el)
    }
  }

  const handleCopyClick = async (e, value, type) => {
    e.preventDefault()
    
    try {
      await navigator.clipboard.writeText(value)
      setCopiedItem(type)
      
      setTimeout(() => {
        setCopiedItem(null)
      }, 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleLanguageChange = (newLang) => {
    if (newLang === currentLanguage) return
    
    console.log('Changing language from', currentLanguage, 'to', newLang)
    
    if (window.triggerPageFlip) {
      window.triggerPageFlip(() => {
        console.log('Callback executed: setting language to', newLang)
        onLanguageChange(newLang)
      })
    } else {
      onLanguageChange(newLang)
    }
  }

  const CELL_CONFIG = {
    paddingLeft: 'pl-6',
    paddingRight: 'pr-6',
    paddingTop: 'pt-6',
    paddingBottom: 'pb-6',
    paddingTopZero: 'pt-0'
  }

  const CONTENT_OFFSET_TOP = '-mt-4'
  
  const SOCIAL_GRID = {
    iconSize: 'w-8 h-8',
    gap: 'gap-5',
    maxWidth: 'max-w-[150px]',
    layout: 'flex-wrap',
    columns: 5
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
    },
    { 
      name: 'discord',
      icon: discordIcon,
      colorIcon: discordColorIcon,
      value: 'dansenak249',
      isCopy: true,
      copyType: 'discord'
    }
  ]

  const languages = [
    { 
      code: 'vi', 
      name: 'Tiếng Việt', 
      shortCode: 'VN',
      flag: vnFlag,
      hoverColorNormal: 'rgba(255, 182, 193, 0.3)',
      hoverColorHighlight: 'linear-gradient(to right, rgba(255, 182, 193, 0.5), rgba(255, 182, 193, 0.7))',
      selectedColor: 'linear-gradient(to right, rgb(252, 231, 243), rgb(251, 207, 232))'
    },
    { 
      code: 'en', 
      name: 'English', 
      shortCode: 'US',
      flag: usFlag,
      hoverColorNormal: 'rgba(147, 197, 253, 0.3)',
      hoverColorHighlight: 'linear-gradient(to right, rgba(147, 197, 253, 0.5), rgba(147, 197, 253, 0.7))',
      selectedColor: 'linear-gradient(to right, rgb(219, 234, 254), rgb(191, 219, 254))'
    }
  ]

  const profileDescription = {
    en: profileDescriptionEnTxt,
    vi: profileDescriptionViTxt
  }

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
          src={isHovered ? social.colorIcon : social.icon}
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
          src={isHovered ? social.colorIcon : social.icon}
          alt={social.name}
          className="w-full h-full object-contain"
        />
      </a>
    )
  }

  return (
    <div className={`flex flex-col gap-0 ${CONTENT_OFFSET_TOP}`}>
      <div ref={addToRefs} className={`bg-white ${CELL_CONFIG.paddingLeft} ${CELL_CONFIG.paddingRight} ${CELL_CONFIG.paddingTop} ${CELL_CONFIG.paddingBottom}`}>
        <h2 className="text-6xl font-bold text-gradient-blue-pink mb-2">Dan</h2>
        <p className="text-[#a7a7a7] text-base font-bold mb-3">@dansenak249</p>
        <div 
          className="text-[#a7a7a7] text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: profileDescription[currentLanguage] }}
        />
      </div>

      <div ref={addToRefs} className={`bg-white ${CELL_CONFIG.paddingLeft} ${CELL_CONFIG.paddingRight} ${CELL_CONFIG.paddingTopZero} ${CELL_CONFIG.paddingBottom} relative`}>
        <h3 className="text-xl font-bold text-[#a7a7a7] mb-4">Socials</h3>
        
        {copiedItem === 'email' && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full animate-pulse z-10">
            Email copied! ✓
          </div>
        )}
        {copiedItem === 'discord' && (
          <div className="absolute top-2 right-2 bg-[#ff69b4] text-white text-xs px-3 py-1 rounded-full animate-pulse z-10">
            Discord copied! ✓
          </div>
        )}
        
        <div className={`flex ${SOCIAL_GRID.layout} ${SOCIAL_GRID.gap} ${SOCIAL_GRID.maxWidth}`}>
          {socialLinks.map((social) => (
            <SocialIcon key={social.name} social={social} />
          ))}
        </div>
      </div>

      <div ref={addToRefs} className={`bg-white ${CELL_CONFIG.paddingLeft} ${CELL_CONFIG.paddingRight} ${CELL_CONFIG.paddingTop} ${CELL_CONFIG.paddingBottom}`}>
        <h3 className="text-xl font-bold text-[#a7a7a7] mb-4">Language</h3>
        <div className="flex flex-col gap-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-300`}
              style={{
                background: currentLanguage === lang.code 
                  ? lang.selectedColor 
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (currentLanguage !== lang.code) {
                  e.currentTarget.style.background = lang.hoverColorNormal
                }
              }}
              onMouseLeave={(e) => {
                if (currentLanguage !== lang.code) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={lang.flag} 
                  alt={lang.shortCode}
                  className="w-8 h-8 object-cover rounded"
                />
                <span className="text-base font-bold text-[#666]">{lang.shortCode}</span>
              </div>
              <span className="text-base font-medium text-[#666]">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LeftColumn