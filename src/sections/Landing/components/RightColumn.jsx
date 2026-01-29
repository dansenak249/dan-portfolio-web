import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import PortfolioGrid from './PortfolioGrid'

// Service images
import serviceImg1 from '../assets/Services/service-1.png'
import serviceGif1 from '../assets/Services/service-1.gif'
import serviceImg2 from '../assets/Services/service-2.png'
import serviceGif2 from '../assets/Services/service-2.gif'

// Service texts
import serviceHeaderEnTxt from '../assets/Services/Texts/service-header-en.txt?raw'
import serviceHeaderViTxt from '../assets/Services/Texts/service-header-vi.txt?raw'
import serviceIllustrationEnTxt from '../assets/Services/Texts/service-illustration-en.txt?raw'
import serviceIllustrationViTxt from '../assets/Services/Texts/service-illustration-vi.txt?raw'
import serviceGamedevEnTxt from '../assets/Services/Texts/service-gamedev-en.txt?raw'
import serviceGamedevViTxt from '../assets/Services/Texts/service-gamedev-vi.txt?raw'
import collaborationEnTxt from '../assets/Collaboration/Texts/collaboration-en.txt?raw'
import collaborationViTxt from '../assets/Collaboration/Texts/collaboration-vi.txt?raw'

const RightColumn = ({ onServiceClick, currentLanguage }) => {
  const cellsRef = useRef([])
  const tabContainerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('services')
  const [hoveredTab, setHoveredTab] = useState(null)

  // ===========================================
  // TAB SWITCH SCROLL CONFIGURATION
  // ===========================================
  const TAB_SCROLL_CONFIG = {
    enabled: true,
    behavior: 'smooth',
    topOffset: 0
  }
  // ===========================================

  useEffect(() => {
    gsap.fromTo(cellsRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.2, ease: 'power2.out', delay: 0.5 })
  }, [])

  const addToRefs = (el) => {
    if (el && !cellsRef.current.includes(el)) {
      cellsRef.current.push(el)
    }
  }

  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return
    
    setActiveTab(tab)
    
    if (TAB_SCROLL_CONFIG.enabled) {
      window.scrollTo({
        top: TAB_SCROLL_CONFIG.topOffset,
        behavior: TAB_SCROLL_CONFIG.behavior
      })
    }
  }

  const SERVICE_CONFIG = {
    cellHeight: 'h-40',
    cellBorderRadius: '16px',
    cellGap: 'gap-4',
    marginTop: 'mt-0',
    marginBottom: 'mb-0',
    imageSize: 'w-40 h-40',
    gap: 'gap-4',
    buttonHeight: 'h-8',
    buttonPadding: 'px-4',
    buttonFontSize: 'text-lg',
    buttonBorderRadius: '16px',
    buttonTextOffsetX: '0px',
    buttonTextOffsetY: '-2px',
    descriptionPaddingLeft: 'pl-0',
    descriptionPaddingRight: 'pr-0',
    descriptionPaddingTop: 'pt-0',
    descriptionPaddingBottom: 'pb-3',
    descriptionFontSize: 'text-base',
    descriptionBgColor: '#ffffff',
    hoverTintColor: '#ffffff'
  }

  const HEADER_CONFIG = {
    cellHeight: 'h-auto',
    cellBorderRadius: '16px',
    paddingLeft: 'pl-0',
    paddingRight: 'pr-0',
    paddingTop: 'pt-2',
    paddingBottom: 'pb-0',
    backgroundColor: '#ffffff'
  }

  const COLLABORATION_CONFIG = {
    paddingLeft: 'pl-8',
    paddingRight: 'pr-8',
    paddingTop: 'pt-8',
    paddingBottom: 'pb-8'
  }

  const serviceHeaderContent = {
    en: serviceHeaderEnTxt,
    vi: serviceHeaderViTxt
  }

  const serviceDescriptions = {
    illustration: {
      en: serviceIllustrationEnTxt,
      vi: serviceIllustrationViTxt
    },
    gamedev: {
      en: serviceGamedevEnTxt,
      vi: serviceGamedevViTxt
    }
  }

  const servicesContent = {
    en: [
      {
        buttonText: 'Animated Illustration',
        sectionId: 'illustration',
        descriptionKey: 'illustration',
        image: serviceImg1,
        gif: serviceGif1,
        buttonColorNormal: '#ff69b4',
        buttonColorNormalEnd: '#ffcc00',
        buttonColorHighlight: '#f6b0b4',
        buttonColorHighlightEnd: '#f7e1c3'
      },
      {
        buttonText: 'Game Development',
        sectionId: 'gamedev',
        descriptionKey: 'gamedev',
        image: serviceImg2,
        gif: serviceGif2,
        buttonColorNormal: '#4a55e2',
        buttonColorNormalEnd: '#00bcd4',
        buttonColorHighlight: '#afaff3',
        buttonColorHighlightEnd: '#f6c8da'
      }
    ],
    vi: [
      {
        buttonText: 'Animated Illustrations',
        sectionId: 'illustration',
        descriptionKey: 'illustration',
        image: serviceImg1,
        gif: serviceGif1,
        buttonColorNormal: '#ff69b4',
        buttonColorNormalEnd: '#ffcc00',
        buttonColorHighlight: '#f8d2d5',
        buttonColorHighlightEnd: '#fef3e2'
      },
      {
        buttonText: 'Game Development',
        sectionId: 'gamedev',
        descriptionKey: 'gamedev',
        image: serviceImg2,
        gif: serviceGif2,
        buttonColorNormal: '#4a55e2',
        buttonColorNormalEnd: '#00bcd4',
        buttonColorHighlight: '#cecef5',
        buttonColorHighlightEnd: '#e8f4f8'
      }
    ]
  }

  const collaborationContent = {
    en: collaborationEnTxt,
    vi: collaborationViTxt
  }

  const services = servicesContent[currentLanguage]

  const ServiceHeaderCell = () => {
    return (
      <div 
        ref={addToRefs}
        className={`${HEADER_CONFIG.cellHeight} ${HEADER_CONFIG.paddingLeft} ${HEADER_CONFIG.paddingRight} ${HEADER_CONFIG.paddingTop} ${HEADER_CONFIG.paddingBottom}`}
        style={{ 
          backgroundColor: HEADER_CONFIG.backgroundColor,
          borderRadius: HEADER_CONFIG.cellBorderRadius
        }}
      >
        <div 
          className="service-header-content"
          dangerouslySetInnerHTML={{ __html: serviceHeaderContent[currentLanguage] }}
        />
      </div>
    )
  }

  const ServiceCard = ({ service, index }) => {
    const [currentImage, setCurrentImage] = useState(service.image)
    const [gifLoaded, setGifLoaded] = useState(false)
    const [isHovering, setIsHovering] = useState(false)

    useEffect(() => {
      if (service.gif) {
        const img = new Image()
        img.onload = () => setGifLoaded(true)
        img.onerror = () => setGifLoaded(false)
        img.src = service.gif
      }
    }, [service.gif])

    const handleMouseEnter = () => {
      setIsHovering(true)
      if (gifLoaded && service.gif) {
        setCurrentImage(service.gif)
      }
    }

    const handleMouseLeave = () => {
      setIsHovering(false)
      setCurrentImage(service.image)
    }

    const handleClick = () => {
      if (onServiceClick && service.sectionId) {
        onServiceClick(service.sectionId)
      }
    }

    return (
      <div 
        ref={addToRefs}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`overflow-hidden transition-all duration-300 flex ${SERVICE_CONFIG.gap} ${SERVICE_CONFIG.cellHeight} group relative cursor-pointer`}
        style={{ 
          backgroundColor: isHovering ? SERVICE_CONFIG.hoverTintColor : '#ffffff',
          borderRadius: SERVICE_CONFIG.cellBorderRadius
        }}
      >
        <div className={`${SERVICE_CONFIG.imageSize} flex-shrink-0 relative z-10`}>
          <img 
            src={currentImage}
            alt={service.buttonText}
            className="w-full h-full object-cover"
          />
        </div>

        <div className={`flex-1 flex flex-col overflow-hidden relative z-10 ${SERVICE_CONFIG.descriptionPaddingLeft} ${SERVICE_CONFIG.descriptionPaddingRight} ${SERVICE_CONFIG.descriptionPaddingTop} ${SERVICE_CONFIG.descriptionPaddingBottom}`}>
          <div 
            className={`flex-1 ${SERVICE_CONFIG.descriptionFontSize} text-[#a7a7a7] leading-relaxed overflow-auto`}
            style={{ 
              backgroundColor: 'transparent'
            }}
            dangerouslySetInnerHTML={{ __html: serviceDescriptions[service.descriptionKey][currentLanguage] }}
          />

          <div 
            className={`${SERVICE_CONFIG.buttonHeight} ${SERVICE_CONFIG.buttonPadding} ${SERVICE_CONFIG.buttonFontSize} flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
            style={{ 
              background: `linear-gradient(to right, ${service.buttonColorNormal}, ${service.buttonColorNormalEnd})`,
              borderRadius: SERVICE_CONFIG.buttonBorderRadius
            }}
          >
            <div 
              className="absolute inset-0"
              style={{ 
                background: `linear-gradient(to right, ${service.buttonColorHighlight}, ${service.buttonColorHighlightEnd})`,
                transform: isHovering ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
              }}
            />
            
            <span 
              className="font-normal text-white leading-tight relative z-10"
              style={{
                transform: `translate(${SERVICE_CONFIG.buttonTextOffsetX}, ${SERVICE_CONFIG.buttonTextOffsetY})`
              }}
            >
              {service.buttonText}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div ref={tabContainerRef} className="flex gap-6 pb-2">
        {['services', 'samples', 'collaboration'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            onMouseEnter={() => setHoveredTab(tab)}
            onMouseLeave={() => setHoveredTab(null)}
            className={`pb-2 relative ${
              activeTab === tab
                ? 'text-2xl text-[#ffa500] font-bold'
                : 'text-2xl text-[#a7a7a7] font-normal'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffa500]" />
            )}
            
            {hoveredTab === tab && activeTab !== tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a7a7a7]" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'services' && (
        <div className={`flex flex-col ${SERVICE_CONFIG.cellGap} ${SERVICE_CONFIG.marginTop} ${SERVICE_CONFIG.marginBottom}`}>
          <ServiceHeaderCell />
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} index={index} />
          ))}
        </div>
      )}

      {activeTab === 'samples' && <PortfolioGrid />}

      {activeTab === 'collaboration' && (
        <div className={`bg-white ${COLLABORATION_CONFIG.paddingLeft} ${COLLABORATION_CONFIG.paddingRight} ${COLLABORATION_CONFIG.paddingTop} ${COLLABORATION_CONFIG.paddingBottom} rounded-lg`}>
          <div 
            className="collaboration-content text-[#a7a7a7] text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: collaborationContent[currentLanguage] }}
          />
        </div>
      )}
    </div>
  )
}

export default RightColumn