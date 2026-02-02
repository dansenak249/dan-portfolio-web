'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import PortfolioGrid from './PortfolioGrid'
import CmsInfo from './CmsInfo'

// Import JSX content components
import TabServiceHeader from '../content/tab-service-header'
import TabServiceIllustration from '../content/tab-service-illustration'
import TabServiceGamedev from '../content/tab-service-gamedev'
import TabCollaboration from '../content/tab-collaboration'

// Service images
import serviceImg1 from '../assets/services/service-1-png.webp'
import serviceGif1 from '../assets/services/service-1-gif.webp'
import serviceImg2 from '../assets/services/service-2-png.webp'
import serviceGif2 from '../assets/services/service-2-gif.webp'

// --- CONFIGURATIONS ---
const SERVICE_CONFIG = {
  // Container padding
  containerPaddingTop: 'pt-0',
  containerPaddingBottom: 'pb-0',
  containerPaddingLeft: 'pl-6',
  containerPaddingRight: 'pr-0',

  // Text Alignment: Set to true for 'text-justify', false for 'text-left'
  textJustify: true,

  cellHeight: 'h-48',
  cellBorderRadius: '0px',
  cellGap: 'gap-2',
  marginTop: 'mt-0',
  marginBottom: 'mb-0',
  imageSize: 'w-48 h-48',
  imageMarginRight: 'mr-0',
  gap: 'gap-4',
  borderWidth: '1px',
  borderColor: '#e5e7eb',
  borderLeftWidth: '6px',
  boxShadow: '0 4px 6px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  boxShadowHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

  buttonHeight: 'h-8',
  buttonPadding: 'px-4',
  buttonFontSize: '18px',
  buttonBorderRadius: '16px',
  buttonTextOffsetX: '0px',
  buttonTextOffsetY: '-2px',
  buttonMarginLeft: 'ml-0',
  buttonMarginRight: 'mr-0',
  buttonMarginTop: 'mt-0',
  buttonMarginBottom: 'mb-1',
  
  descriptionPaddingLeft: 'pl-4',
  descriptionPaddingRight: 'pr-0',
  descriptionPaddingTop: 'pt-4',
  descriptionPaddingBottom: 'pb-3',
  descriptionFontSize: 'text-base',
  descriptionBgColor: '#ffffff',
  hoverTintColor: '#ffffff'
}

const HEADER_CONFIG = {
  cellHeight: 'h-auto',
  cellBorderRadius: '0px',
  paddingLeft: 'pl-0',
  paddingRight: 'pr-0',
  paddingTop: 'pt-0',
  paddingBottom: 'pb-1',
  backgroundColor: '#ffffff',
  borderWidth: '0px',
  borderColor: '#e5e7eb'
}

// --- SUB-COMPONENTS ---

const ServiceHeaderCell = ({ currentLanguage, addToRefs }) => (
  <div 
    ref={addToRefs}
    className={`border ${HEADER_CONFIG.cellHeight} ${HEADER_CONFIG.paddingLeft} ${HEADER_CONFIG.paddingRight} ${HEADER_CONFIG.paddingTop} ${HEADER_CONFIG.paddingBottom}`}
    style={{ 
      backgroundColor: HEADER_CONFIG.backgroundColor,
      borderRadius: HEADER_CONFIG.cellBorderRadius,
      borderColor: HEADER_CONFIG.borderColor,
      borderWidth: HEADER_CONFIG.borderWidth,
      borderStyle: 'solid'
    }}
  >
    {/* Apply text justification based on config */}
    <div className={`service-header-content ${SERVICE_CONFIG.textJustify ? 'text-justify' : 'text-left'}`}>
      <TabServiceHeader language={currentLanguage} />
    </div>
  </div>
);

const ServiceCard = ({ service, currentLanguage, onServiceClick, addToRefs }) => {
  const [currentImage, setCurrentImage] = useState(service.image.src);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Preload gif to avoid flicker
    if (service.gif) {
      const img = new Image();
      img.onload = () => setCurrentImage(service.gif.src);
      img.src = service.gif.src;
    }
  }, [service.gif]);

  const shadowColor = service.buttonColorNormal;
  const ContentComponent = service.contentComponent;

  return (
    <div 
      ref={addToRefs}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => onServiceClick?.(service.sectionId)}
      className={`border overflow-hidden transition-all duration-300 flex ${SERVICE_CONFIG.gap} ${SERVICE_CONFIG.cellHeight} group relative cursor-pointer`}
      style={{ 
        backgroundColor: isHovering ? SERVICE_CONFIG.hoverTintColor : '#ffffff',
        borderRadius: SERVICE_CONFIG.cellBorderRadius,
        borderWidth: SERVICE_CONFIG.borderWidth,
        borderColor: SERVICE_CONFIG.borderColor,
        borderStyle: 'solid',
        boxShadow: isHovering 
          ? `0 10px 20px -5px ${shadowColor}44`
          : `0 4px 6px -1px ${shadowColor}22`
      }}
    >
      <div 
        className="h-full flex-shrink-0"
        style={{ 
          width: SERVICE_CONFIG.borderLeftWidth,
          background: `linear-gradient(to bottom, ${service.buttonColorNormal}, ${service.buttonColorNormalEnd})`
        }}
      />

      <div className={`flex-1 flex flex-col overflow-hidden relative z-10 ${SERVICE_CONFIG.descriptionPaddingLeft} ${SERVICE_CONFIG.descriptionPaddingRight} ${SERVICE_CONFIG.descriptionPaddingTop} ${SERVICE_CONFIG.descriptionPaddingBottom}`}>
        {/* Apply text justification based on config */}
        <div className={`flex-1 ${SERVICE_CONFIG.descriptionFontSize} text-[#a7a7a7] leading-relaxed overflow-auto ${SERVICE_CONFIG.textJustify ? 'text-justify' : 'text-left'}`}>
          <ContentComponent language={currentLanguage} />
        </div>

        <div 
          className={`${SERVICE_CONFIG.buttonHeight} ${SERVICE_CONFIG.buttonPadding} 
                      ${SERVICE_CONFIG.buttonMarginLeft} ${SERVICE_CONFIG.buttonMarginRight} 
                      ${SERVICE_CONFIG.buttonMarginTop} ${SERVICE_CONFIG.buttonMarginBottom}
                      flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
          style={{ 
            background: `linear-gradient(to right, ${service.buttonColorNormal}, ${service.buttonColorNormalEnd})`,
            borderRadius: SERVICE_CONFIG.buttonBorderRadius,
            fontSize: SERVICE_CONFIG.buttonFontSize
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
            style={{ transform: `translate(${SERVICE_CONFIG.buttonTextOffsetX}, ${SERVICE_CONFIG.buttonTextOffsetY})` }}
          >
            {service.buttonText}
          </span>
        </div>
      </div>

      <div className={`${SERVICE_CONFIG.imageSize} ${SERVICE_CONFIG.imageMarginRight} h-full flex-shrink-0 flex items-center justify-center relative z-10`}>
        <img 
          src={currentImage.src || currentImage}
          alt="service"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const RightColumn = ({ currentLanguage }) => {
  const cellsRef = useRef([])
  const tabContainerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('services')
  const [hoveredTab, setHoveredTab] = useState(null)
  const hasAnimatedRef = useRef(false)
  const [cmsSection, setCmsSection] = useState(null)

  useEffect(() => {
    if (activeTab === 'services' && !hasAnimatedRef.current && cellsRef.current.length > 0) {
      gsap.fromTo(cellsRef.current, 
        { opacity: 0, y: 30 }, 
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          stagger: 0.2, 
          ease: 'power2.out', 
          delay: 0.5,
          onComplete: () => {
            hasAnimatedRef.current = true; 
          }
        }
      )
    }
  }, [activeTab])

  const addToRefs = (el) => {
    if (el && !cellsRef.current.includes(el)) {
      cellsRef.current.push(el)
    }
  }

  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return
    cellsRef.current = []
    setActiveTab(tab)
  }

  const handleServiceClick = (sectionId) => {
    setCmsSection(sectionId)
  }

  const servicesContent = {
    en: [
      { 
        buttonText: 'Explore', 
        sectionId: 'illustration', 
        contentComponent: TabServiceIllustration,
        image: serviceImg1, 
        gif: serviceGif1, 
        buttonColorNormal: '#ff69b4', 
        buttonColorNormalEnd: '#ffcc00', 
        buttonColorHighlight: '#f6b0b4', 
        buttonColorHighlightEnd: '#f7e1c3' 
      },
      { 
        buttonText: 'Explore', 
        sectionId: 'gamedev', 
        contentComponent: TabServiceGamedev,
        image: serviceImg2, 
        gif: serviceGif2, 
        buttonColorNormal: '#7978e6', 
        buttonColorNormalEnd: '#e99bba', 
        buttonColorHighlight: '#afaff3', 
        buttonColorHighlightEnd: '#f6c8da' 
      }
    ],
    vi: [
      { 
        buttonText: 'Khám phá', 
        sectionId: 'illustration', 
        contentComponent: TabServiceIllustration,
        image: serviceImg1, 
        gif: serviceGif1, 
        buttonColorNormal: '#ff69b4', 
        buttonColorNormalEnd: '#ffcc00', 
        buttonColorHighlight: '#f8d2d5', 
        buttonColorHighlightEnd: '#fef3e2' 
      },
      { 
        buttonText: 'Khám phá', 
        sectionId: 'gamedev', 
        contentComponent: TabServiceGamedev,
        image: serviceImg2, 
        gif: serviceGif2, 
        buttonColorNormal: '#7978e6', 
        buttonColorNormalEnd: '#e99bba', 
        buttonColorHighlight: '#cecef5', 
        buttonColorHighlightEnd: '#e8f4f8' 
      }
    ]
  }

  const services = servicesContent[currentLanguage]

  return (
    <>
      <div className={`flex flex-col 
        ${SERVICE_CONFIG.containerPaddingTop} 
        ${SERVICE_CONFIG.containerPaddingBottom} 
        ${SERVICE_CONFIG.containerPaddingLeft} 
        ${SERVICE_CONFIG.containerPaddingRight}`}
      >
        {/* Changed: back to justify-start (default) to align tabs to the left */}
        <div ref={tabContainerRef} className="flex justify-start gap-6 pb-2">
          {['services', 'samples', 'collaboration'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              onMouseEnter={() => setHoveredTab(tab)}
              onMouseLeave={() => setHoveredTab(null)}
              className={`pb-2 relative ${activeTab === tab ? 'text-2xl text-[#af83b9] font-bold' : 'text-2xl text-[#a7a7a7] font-normal'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#af83b9]" />}
              {hoveredTab === tab && activeTab !== tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a7a7a7] padding" />}
            </button>
          ))}
        </div> 

        {activeTab === 'services' && (
          <div className={`flex flex-col ${SERVICE_CONFIG.cellGap} ${SERVICE_CONFIG.marginTop} ${SERVICE_CONFIG.marginBottom}`}>
            <ServiceHeaderCell 
              currentLanguage={currentLanguage} 
              addToRefs={addToRefs} 
            />
            {services.map((service, index) => (
              <ServiceCard 
                key={index} 
                service={service} 
                currentLanguage={currentLanguage}
                onServiceClick={handleServiceClick}
                addToRefs={addToRefs}
              />
            ))}
          </div>
        )}

        {activeTab === 'samples' && <PortfolioGrid />}

        {activeTab === 'collaboration' && (
          <div className="bg-white p-0 rounded-lg">
            {/* Apply text justification based on config */}
            <div className={`collaboration-content text-[#a7a7a7] text-base leading-relaxed ${SERVICE_CONFIG.textJustify ? 'text-justify' : 'text-left'}`}>
              <TabCollaboration language={currentLanguage} />
            </div>
          </div>
        )}
      </div>

      {cmsSection && (
        <CmsInfo 
          section={cmsSection}
          currentLanguage={currentLanguage}
          onClose={() => setCmsSection(null)}
        />
      )}
    </>
  )
}

export default RightColumn