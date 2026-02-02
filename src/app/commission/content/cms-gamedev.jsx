// src/app/commission/content/CmsGamedev.jsx

import cmsImage1 from '../assets/cms/cms-gamedev-1.webp'
import cmsHeaderImage from '../assets/cms/cms-gamedev-header.webp'

const CmsGamedev = ({ language }) => {
  // ===========================================
  // MULTI-LANGUAGE WRAPPER COMPONENT
  // ===========================================
  
  const T = ({ children }) => {
    const childArray = Array.isArray(children) ? children : [children]
    
    for (const child of childArray) {
      if (!child || !child.type) continue
      
      const langTag = child.type.toLowerCase()
      if (langTag === language) {
        return child.props.children
      }
    }
    
    // Fallback to 'en' if current language not found
    for (const child of childArray) {
      if (!child || !child.type) continue
      if (child.type.toLowerCase() === 'en') {
        return child.props.children
      }
    }
    
    return null
  }
  
  // Language tags
  const en = ({ children }) => children
  const vi = ({ children }) => children

  // ===========================================
  // CONFIGURATION SECTION
  // ===========================================
  
  const CONFIG = {
    // Page Background
    pageBackground: '#ffffff',
    
    // Content Container (Main wrapper for all content)
    contentContainer: {
      paddingX: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
    },

    // Section Spacing
    sectionSpacing: {
      marginBottom: 'mb-8',
    },
    
    // Header Section (Top banner with title)
    headerSection: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingX: '24px',
      marginBottom: 'mb-8',
      titleColor: '#7c3aed',
      titleSize: 'text-4xl',
      titleWeight: 'font-bold',
      titleMarginBottom: 'mb-4',
      subtitleColor: '#9333ea',
      subtitleSize: 'text-lg',
      subtitleStyle: 'italic',
    },

    // Table of Contents
    tableOfContents: {
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingX: '24px',
      marginBottom: 'mb-8',
      titleColor: '#7c3aed',
      titleSize: 'text-2xl',
      titleWeight: 'font-bold',
      titleMarginBottom: 'mb-4',
      linkColor: '#00B0F0',
      linkHoverColor: '#1e40af',
      linkUnderline: false,
      bulletColor: '#00B0F0',
    },

    // Section Headers (H2)
    sectionHeader: {
      color: '#7D6799',
      size: 'text-3xl',
      weight: 'font-bold',
      marginBottom: 'mb-6',
      paddingX: '0px',
    },

    // Sub Headers (H3)
    subHeader: {
      color: '#7D6799',
      size: 'text-xl',
      weight: 'font-semibold',
      marginBottom: 'mb-3',
      paddingX: '0px',
    },

    // Small Headers (H4)
    smallHeader: {
      color: '#7D6799',
      size: 'text-lg',
      weight: 'font-semibold',
      marginBottom: 'mb-2',
      paddingX: '0px',
    },

    // Body Text
    bodyText: {
      color: '#7D6799',
      size: 'text-base',
      lineHeight: 'leading-relaxed',
      paddingX: '0px',
      marginBottom: 'mb-4',
    },

    // Content Box
    contentBox: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      paddingTop: '24px',
      paddingBottom: '24px',
      paddingX: '24px',
      marginBottom: 'mb-6',
    },

    // Highlight Box
    highlightBox: {
      backgroundColor: '#d1fae5',
      borderRadius: '8px',
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingX: '16px',
      marginBottom: 'mb-4',
    },

    // Price Table
    priceTable: {
      borderColor: '#00B0F0',
      headerBackgroundColor: '#ffffff',
      headerTextColor: '#7c3aed',
      cellBackgroundColor: '#ffffff',
      cellTextColor: '#7D6799',
      cellPadding: 'px-4 py-3',
      borderWidth: '1px',
      marginBottom: 'mb-6',
    },

    // Call to Action Box
    ctaBox: {
      backgroundGradient: 'from-purple-100 to-pink-100',
      borderRadius: '8px',
      paddingTop: '32px',
      paddingBottom: '32px',
      paddingX: '32px',
      marginTop: 'mt-12',
      titleColor: '#7c3aed',
      titleSize: 'text-2xl',
      titleWeight: 'font-bold',
      titleMarginBottom: 'mb-3',
      textColor: '#374151',
      textSize: 'text-lg',
      textMarginBottom: 'mb-4',
      accentColor: '#9333ea',
      accentWeight: 'font-semibold',
    },

    // Image
    image: {
      maxWidth: 'max-w-2xl',
      borderRadius: 'rounded-lg',
      shadow: 'shadow-lg',
      marginY: 'my-8',
    },

    // Header Image (below first content box)
    headerImage: {
      maxWidth: 'max-w-4xl',
      borderRadius: 'rounded-lg',
      shadow: 'shadow-lg',
      marginY: 'my-8',
    },

    // List
    list: {
      spacing: 'space-y-2',
      bulletColor: '#7D6799',
      textColor: '#7D6799',
      indentLeft: '6px',
      marginBottom: 'mb-4',
    },
  }

  // ===========================================
  // END OF CONFIGURATION
  // ===========================================

  // Smooth scroll to section
  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div 
      className="max-w-none" 
      style={{ 
        backgroundColor: CONFIG.pageBackground,
        paddingLeft: CONFIG.contentContainer.paddingX,
        paddingRight: CONFIG.contentContainer.paddingX,
        paddingTop: CONFIG.contentContainer.paddingTop,
        paddingBottom: CONFIG.contentContainer.paddingBottom,
      }}
    >
      {/* Header with configurable background */}
      <div 
        className={CONFIG.headerSection.marginBottom}
        style={{ 
          backgroundColor: CONFIG.headerSection.backgroundColor,
          borderRadius: CONFIG.headerSection.borderRadius,
          paddingTop: CONFIG.headerSection.paddingTop,
          paddingBottom: CONFIG.headerSection.paddingBottom,
          paddingLeft: CONFIG.headerSection.paddingX,
          paddingRight: CONFIG.headerSection.paddingX,
        }}
      >
        <h1 
          className={`${CONFIG.headerSection.titleSize} ${CONFIG.headerSection.titleWeight} ${CONFIG.headerSection.titleMarginBottom}`}
          style={{ color: CONFIG.headerSection.titleColor }}
        >
          <T>
            <en>GAME DEVELOPMENT</en>
            <vi>GAME DEVELOPMENT</vi>
          </T>
        </h1>
        <p 
          className={`${CONFIG.headerSection.subtitleSize} ${CONFIG.headerSection.subtitleStyle}`}
          style={{ color: CONFIG.headerSection.subtitleColor }}
        >
          <T>
            <en>
              Do you have a unique game idea, an adorable OC, and your own magical world, 
              but aren't satisfied with the current art commissions and want a more original 
              storytelling approach?
            </en>
            <vi>
              Do you have a unique game idea, an adorable OC, and your own magical world, 
              but aren't satisfied with the current art commissions and want a more original 
              storytelling approach?
            </vi>
          </T>
        </p>
      </div>

      {/* Header Image - Featured image for the article */}
      <div className={CONFIG.headerImage.marginY}>
        <img 
          src={cmsHeaderImage.src} 
          alt="Game Development Cover"
          className={`w-full ${CONFIG.headerImage.maxWidth} mx-auto ${CONFIG.headerImage.borderRadius} ${CONFIG.headerImage.shadow}`}
        />
      </div>

      {/* Table of Contents */}
      <div 
        className={CONFIG.tableOfContents.marginBottom}
        style={{ 
          backgroundColor: CONFIG.tableOfContents.backgroundColor,
          borderRadius: CONFIG.tableOfContents.borderRadius,
          paddingTop: CONFIG.tableOfContents.paddingTop,
          paddingBottom: CONFIG.tableOfContents.paddingBottom,
          paddingLeft: CONFIG.tableOfContents.paddingX,
          paddingRight: CONFIG.tableOfContents.paddingX,
        }}
      >
        <h2 
          className={`${CONFIG.tableOfContents.titleSize} ${CONFIG.tableOfContents.titleWeight} ${CONFIG.tableOfContents.titleMarginBottom}`}
          style={{ color: CONFIG.tableOfContents.titleColor }}
        >
          <T>
            <en>Table of Contents</en>
            <vi>Table of Contents</vi>
          </T>
        </h2>
        <ul className="space-y-2">
          {/* Main item - About Game Development */}
          <li>
            <button 
              onClick={() => scrollToSection('about')}
              className="transition-colors font-semibold"
              style={{ color: CONFIG.tableOfContents.linkColor }}
              onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
              onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
            >
              <T>
                <en>About Game Development</en>
                <vi>About Game Development</vi>
              </T>
            </button>
            <ul className="mt-1 space-y-1" style={{ paddingLeft: CONFIG.list.indentLeft }}>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: CONFIG.tableOfContents.bulletColor }}>•</span>
                <button 
                  onClick={() => scrollToSection('difficulty')}
                  className="transition-colors"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                  onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
                  onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                >
                  <T>
                    <en>Is GameDev so difficult as people say?</en>
                    <vi>Is GameDev so difficult as people say?</vi>
                  </T>
                </button>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: CONFIG.tableOfContents.bulletColor }}>•</span>
                <button 
                  onClick={() => scrollToSection('process')}
                  className="transition-colors"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                  onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
                  onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                >
                  <T>
                    <en>Work Process</en>
                    <vi>Work Process</vi>
                  </T>
                </button>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: CONFIG.tableOfContents.bulletColor }}>•</span>
                <button 
                  onClick={() => scrollToSection('price')}
                  className="transition-colors"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                  onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
                  onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                >
                  <T>
                    <en>Game Development Price</en>
                    <vi>Game Development Price</vi>
                  </T>
                </button>
              </li>
            </ul>
          </li>

          {/* Main item - Term of Service */}
          <li>
            <button 
              onClick={() => scrollToSection('tos')}
              className="transition-colors font-semibold"
              style={{ color: CONFIG.tableOfContents.linkColor }}
              onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
              onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
            >
              <T>
                <en>Term of Service</en>
                <vi>Term of Service</vi>
              </T>
            </button>
            <ul className="mt-1 space-y-1" style={{ paddingLeft: CONFIG.list.indentLeft }}>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: CONFIG.tableOfContents.bulletColor }}>•</span>
                <button 
                  onClick={() => scrollToSection('contact')}
                  className="transition-colors"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                  onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
                  onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                >
                  <T>
                    <en>Contact Information</en>
                    <vi>Contact Information</vi>
                  </T>
                </button>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: CONFIG.tableOfContents.bulletColor }}>•</span>
                <button 
                  onClick={() => scrollToSection('payment')}
                  className="transition-colors"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                  onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
                  onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                >
                  <T>
                    <en>Payment & Refund Policy</en>
                    <vi>Payment & Refund Policy</vi>
                  </T>
                </button>
              </li>
              <li className="flex items-start">
                <span className="mr-2" style={{ color: CONFIG.tableOfContents.bulletColor }}>•</span>
                <button 
                  onClick={() => scrollToSection('copyright')}
                  className="transition-colors"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                  onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                  onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
                >
                  <T>
                    <en>Copyright & Usage Rights</en>
                    <vi>Copyright & Usage Rights</vi>
                  </T>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      {/* About Game Development */}
      <section id="about" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <h2 
          className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} ${CONFIG.sectionHeader.marginBottom}`}
          style={{ 
            color: CONFIG.sectionHeader.color,
            paddingLeft: CONFIG.sectionHeader.paddingX,
            paddingRight: CONFIG.sectionHeader.paddingX,
          }}
        >
          <T>
            <en>About Game Development</en>
            <vi>About Game Development</vi>
          </T>
        </h2>
        
        <div id="difficulty" className="mb-6 scroll-mt-4">
          <h3 
            className={`${CONFIG.subHeader.size} ${CONFIG.subHeader.weight} ${CONFIG.subHeader.marginBottom}`}
            style={{ 
              color: CONFIG.subHeader.color,
              paddingLeft: CONFIG.subHeader.paddingX,
              paddingRight: CONFIG.subHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Is GameDev so difficult as people say?</en>
              <vi>🔸 Is GameDev so difficult as people say?</vi>
            </T>
          </h3>
          <div 
            className={`space-y-4 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  Well.. yes ~(&#62;_&#60;。)＼. Even in 2026, with widespread availability of leading 
                  development libraries and technologies like Unity / Unreal, or even advanced AI like 
                  ChatGPT or Claude Code, game development remains a very difficult field for an individual 
                  to undertake a project on their own.
                </en>
                <vi>
                  Well.. yes ~(&#62;_&#60;。)＼. Even in 2026, with widespread availability of leading 
                  development libraries and technologies like Unity / Unreal, or even advanced AI like 
                  ChatGPT or Claude Code, game development remains a very difficult field for an individual 
                  to undertake a project on their own.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  Game development isn't as simple as people think, just "draw something" and "write code 
                  to make it work." The process actually requires collaboration from many different areas, 
                  from writing game mechanics to designing and illustrating characters and backgrounds, 
                  animation and visual effects, not to mention storyline and world building. Despite being 
                  an IT student, self taught Art and worked in game industry for over 3 years, I couldn't 
                  complete a full game project without the help of my friends and colleagues.
                </en>
                <vi>
                  Game development isn't as simple as people think, just "draw something" and "write code 
                  to make it work." The process actually requires collaboration from many different areas, 
                  from writing game mechanics to designing and illustrating characters and backgrounds, 
                  animation and visual effects, not to mention storyline and world building. Despite being 
                  an IT student, self taught Art and worked in game industry for over 3 years, I couldn't 
                  complete a full game project without the help of my friends and colleagues.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  Because it's so difficult, many of my friends have interesting ideas and worlds with 
                  amazing characters, and they really want to use games as a way to tell their stories, 
                  but they can't do it themselves. So I with our team decided to open this service to 
                  help people build their own worlds.
                </en>
                <vi>
                  Because it's so difficult, many of my friends have interesting ideas and worlds with 
                  amazing characters, and they really want to use games as a way to tell their stories, 
                  but they can't do it themselves. So I with our team decided to open this service to 
                  help people build their own worlds.
                </vi>
              </T>
            </p>
          </div>
        </div>

        {/* Image */}
        <div className={CONFIG.image.marginY}>
          <img 
            src={cmsImage1.src} 
            alt="Game Development Process"
            className={`w-full ${CONFIG.image.maxWidth} mx-auto ${CONFIG.image.borderRadius} ${CONFIG.image.shadow}`}
          />
        </div>

        <div id="process" className="mb-6 scroll-mt-4">
          <h3 
            className={`${CONFIG.subHeader.size} ${CONFIG.subHeader.weight} ${CONFIG.subHeader.marginBottom}`}
            style={{ 
              color: CONFIG.subHeader.color,
              paddingLeft: CONFIG.subHeader.paddingX,
              paddingRight: CONFIG.subHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Work Process:</en>
              <vi>🔸 Work Process:</vi>
            </T>
          </h3>
          <div 
            className={`space-y-4 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  The project will only begin when a complete <strong>Game Design Document</strong> is 
                  available, along with all <strong>Assets</strong> (including Sprites / Models, 
                  Animations, Audio, UI, and VFX if any).
                </en>
                <vi>
                  The project will only begin when a complete <strong>Game Design Document</strong> is 
                  available, along with all <strong>Assets</strong> (including Sprites / Models, 
                  Animations, Audio, UI, and VFX if any).
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  During the development process, <strong>Assets can be freely modified</strong> (within 
                  permitted limits) an unlimited number of times without charge. However, changing the 
                  Game Design is strictly prohibited as it will affect the entire system. If you really 
                  want to make changes, I will gladly help you for free, but please don't overuse this 
                  ≧ ﹏ ≦.
                </en>
                <vi>
                  During the development process, <strong>Assets can be freely modified</strong> (within 
                  permitted limits) an unlimited number of times without charge. However, changing the 
                  Game Design is strictly prohibited as it will affect the entire system. If you really 
                  want to make changes, I will gladly help you for free, but please don't overuse this 
                  ≧ ﹏ ≦.
                </vi>
              </T>
            </p>
          </div>
        </div>
      </section>

      {/* Game Development Price */}
      <section id="price" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <h3 
          className={`${CONFIG.subHeader.size} ${CONFIG.subHeader.weight} ${CONFIG.subHeader.marginBottom}`}
          style={{ 
            color: CONFIG.subHeader.color,
            paddingLeft: CONFIG.subHeader.paddingX,
            paddingRight: CONFIG.subHeader.paddingX,
          }}
        >
          <T>
            <en>🔸 Game Development Price</en>
            <vi>🔸 Game Development Price</vi>
          </T>
        </h3>
        
        <div 
          className={`space-y-4 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
          style={{ 
            color: CONFIG.bodyText.color,
            paddingLeft: CONFIG.bodyText.paddingX,
            paddingRight: CONFIG.bodyText.paddingX,
            marginBottom: '24px'
          }}
        >
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>
                Based on scale, games can be divided into five categories: Hypercasual (Flappy Bird), 
                Casual (Candy Crush Saga), Midcore (Clash Royal), Hardcore (CS:GO), and AAA (GTA V).
              </en>
              <vi>
                Based on scale, games can be divided into five categories: Hypercasual (Flappy Bird), 
                Casual (Candy Crush Saga), Midcore (Clash Royal), Hardcore (CS:GO), and AAA (GTA V).
              </vi>
            </T>
          </p>
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>
                The price below only includes technical services (game programming, environment setup, 
                interface integration, graphics optimization…). <strong>It does not include</strong> Game 
                Design, Illustration, Animation, BGM / SFX or Visual FX…
              </en>
              <vi>
                The price below only includes technical services (game programming, environment setup, 
                interface integration, graphics optimization…). <strong>It does not include</strong> Game 
                Design, Illustration, Animation, BGM / SFX or Visual FX…
              </vi>
            </T>
          </p>
        </div>

        {/* Price Table */}
        <div className={`overflow-x-auto ${CONFIG.priceTable.marginBottom}`}>
          <table 
            className="min-w-full border-collapse"
            style={{ 
              borderWidth: CONFIG.priceTable.borderWidth,
              borderColor: CONFIG.priceTable.borderColor,
              borderStyle: 'solid'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: CONFIG.priceTable.headerBackgroundColor }}>
                <th 
                  className={`text-left ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.headerTextColor,
                    fontWeight: 'bold'
                  }}
                >
                  <T>
                    <en>Category</en>
                    <vi>Category</vi>
                  </T>
                </th>
                <th 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.headerTextColor,
                    fontWeight: 'bold'
                  }}
                >
                  Prototype
                </th>
                <th 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.headerTextColor,
                    fontWeight: 'bold'
                  }}
                >
                  Demo
                </th>
                <th 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.headerTextColor,
                    fontWeight: 'bold'
                  }}
                >
                  Full
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Hypercasual */}
              <tr style={{ backgroundColor: CONFIG.priceTable.cellBackgroundColor }}>
                <td 
                  className={CONFIG.priceTable.cellPadding}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor,
                    fontWeight: '600'
                  }}
                >
                  Hypercasual
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $700
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $1,200
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $6,000
                </td>
              </tr>

              {/* Casual */}
              <tr style={{ backgroundColor: CONFIG.priceTable.cellBackgroundColor }}>
                <td 
                  className={CONFIG.priceTable.cellPadding}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor,
                    fontWeight: '600'
                  }}
                >
                  Casual
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $1,200
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $2,300
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $11,000
                </td>
              </tr>

              {/* Midcore - Empty cells */}
              <tr style={{ backgroundColor: CONFIG.priceTable.cellBackgroundColor }}>
                <td 
                  className={CONFIG.priceTable.cellPadding}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor,
                    fontWeight: '600'
                  }}
                >
                  Midcore
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  
                </td>
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p 
          className={`${CONFIG.bodyText.size} italic`}
          style={{ 
            color: CONFIG.bodyText.color,
            paddingLeft: CONFIG.bodyText.paddingX,
            paddingRight: CONFIG.bodyText.paddingX,
          }}
        >
          <T>
            <en>
              The price above is an estimated price, as the game varies greatly in complexity and length. 
              Both commercial and non-commercial are the same.
            </en>
            <vi>
              The price above is an estimated price, as the game varies greatly in complexity and length. 
              Both commercial and non-commercial are the same.
            </vi>
          </T>
        </p>
      </section>

      {/* Term of Service */}
      <section id="tos" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <div 
          className={CONFIG.contentBox.marginBottom}
          style={{ 
            backgroundColor: CONFIG.contentBox.backgroundColor,
            borderRadius: CONFIG.contentBox.borderRadius,
            paddingTop: CONFIG.contentBox.paddingTop,
            paddingBottom: CONFIG.contentBox.paddingBottom,
            paddingLeft: CONFIG.contentBox.paddingX,
            paddingRight: CONFIG.contentBox.paddingX,
          }}
        >
          <h2 
            className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} mb-4`}
            style={{ color: CONFIG.sectionHeader.color }}
          >
            <T>
              <en>TERM OF SERVICE</en>
              <vi>TERM OF SERVICE</vi>
            </T>
          </h2>
          <p 
            className={`${CONFIG.headerSection.subtitleSize} ${CONFIG.headerSection.subtitleStyle}`}
            style={{ color: CONFIG.headerSection.subtitleColor }}
          >
            <T>
              <en>
                By placing a commission, you agree to the terms below. 
                Please read everything carefully so we can have a smooth and magical collab!
              </en>
              <vi>
                By placing a commission, you agree to the terms below. 
                Please read everything carefully so we can have a smooth and magical collab!
              </vi>
            </T>
          </p>
        </div>

        {/* Contact Information */}
        <div id="contact" className="mb-8 scroll-mt-4">
          <h3 
            className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} mb-4`}
            style={{ 
              color: CONFIG.sectionHeader.color,
              paddingLeft: CONFIG.sectionHeader.paddingX,
              paddingRight: CONFIG.sectionHeader.paddingX,
            }}
          >
            <T>
              <en>Contact Information</en>
              <vi>Contact Information</vi>
            </T>
          </h3>
          <ul 
            className={`${CONFIG.list.spacing} ${CONFIG.list.marginBottom} list-disc list-inside`}
            style={{ 
              color: CONFIG.list.textColor,
              paddingLeft: CONFIG.list.indentLeft
            }}
          >
            <li>
              <T>
                <en>I accept commision through any platform noted in my Profile.</en>
                <vi>I accept commision through any platform noted in my Profile.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  My active hours are <strong>20:00-23:59 UTC+7</strong>, and I usually reply within 24 hours.
                </en>
                <vi>
                   My active hours are <strong>20:00-23:59 UTC+7</strong>, and I usually reply within 24 hours.
                </vi>
              </T>
            </li>
            <li>
              <T>
                <en>If you pay via PayPal, I'll send you a proper invoice to keep things secure and organized.</en>
                <vi>If you pay via PayPal, I'll send you a proper invoice to keep things secure and organized.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  When placing your order, please include: <strong>Game Design Document</strong> and full <strong>Assets</strong>.
                </en>
                <vi>
                  When placing your order, please include: <strong>Game Design Document</strong> and full <strong>Assets</strong>.
                </vi>
              </T>
            </li>
          </ul>
        </div>

        {/* Payment & Refund Policy */}
        <div id="payment" className="mb-8 scroll-mt-4">
          <h3 
            className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} mb-4`}
            style={{ 
              color: CONFIG.sectionHeader.color,
              paddingLeft: CONFIG.sectionHeader.paddingX,
              paddingRight: CONFIG.sectionHeader.paddingX,
            }}
          >
            <T>
              <en>Payment & Refund Policy</en>
              <vi>Payment & Refund Policy</vi>
            </T>
          </h3>
          
          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Price</en>
              <vi>🔸 Price</vi>
            </T>
          </h4>
          <ul 
            className={`${CONFIG.list.spacing} ${CONFIG.list.marginBottom} list-disc list-inside`}
            style={{ 
              color: CONFIG.list.textColor,
              paddingLeft: CONFIG.list.indentLeft
            }}
          >
            <li>
              <T>
                <en>Prices above are based on non-commercial purpose. Commercial Fees will be charge by Total Price x2-3 base on each purpose.</en>
                <vi>Prices above are based on non-commercial purpose. Commercial Fees will be charge by Total Price x2-3 base on each purpose.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Private commission comes with 50% Fee.</en>
                <vi>Private commission comes with 50% Fee.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Prices may be changed due to complexity of commission.</en>
                <vi>Prices may be changed due to complexity of commission.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Short/rush deadline must have to be charged around 50-100% Total Price, depending on your brief.</en>
                <vi>Short/rush deadline must have to be charged around 50-100% Total Price, depending on your brief.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Commission prices may be updated regularly without prior notice.</en>
                <vi>Commission prices may be updated regularly without prior notice.</vi>
              </T>
            </li>
          </ul>

          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Payment</en>
              <vi>🔸 Payment</vi>
            </T>
          </h4>
          <ul 
            className={`${CONFIG.list.spacing} ${CONFIG.list.marginBottom} list-disc list-inside`}
            style={{ 
              color: CONFIG.list.textColor,
              paddingLeft: CONFIG.list.indentLeft
            }}
          >
            <li>
              <T>
                <en>100% upfront payment is required before I start. For large projects, we can split it into 2 payments upon agreement.</en>
                <vi>100% upfront payment is required before I start. For large projects, we can split it into 2 payments upon agreement.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>PayPal only. I don't accept other payment methods.</en>
                <vi>PayPal only. I don't accept other payment methods.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>I will hold your slot for 7 days after confirmation. If no payment is made, the slot will be released.</en>
                <vi>I will hold your slot for 7 days after confirmation. If no payment is made, the slot will be released.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  If you send the wrong amount or there's a payment error, I'll do my best to help. 
                  However, I'm not responsible for incorrect PayPal emails.
                </en>
                <vi>
                  If you send the wrong amount or there's a payment error, I'll do my best to help. 
                  However, I'm not responsible for incorrect PayPal emails.
                </vi>
              </T>
            </li>
          </ul>

          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Refund</en>
              <vi>🔸 Refund</vi>
            </T>
          </h4>
          <ul 
            className={`${CONFIG.list.spacing} ${CONFIG.list.marginBottom} list-disc list-inside`}
            style={{ 
              color: CONFIG.list.textColor,
              paddingLeft: CONFIG.list.indentLeft
            }}
          >
            <li>
              <T>
                <en>100% if I <strong>haven't started</strong> working on your commission (not include the Paypal extra fee).</en>
                <vi>100% if I <strong>haven't started</strong> working on your commission (not include the Paypal extra fee).</vi>
              </T>
            </li>
            <li>
              <T>
                <en>50% if I've done <strong>Visual & Interaction</strong> and started <strong>Core System</strong>.</en>
                <vi>50% if I've done <strong>Visual & Interaction</strong> and started <strong>Core System</strong>.</vi>
              </T>
            </li>
          </ul>

          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Tax & Fee Notice</en>
              <vi>🔸 Tax & Fee Notice</vi>
            </T>
          </h4>
          <p 
            className={CONFIG.bodyText.size}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <T>
              <en>
                As a Freelancer in Vietnam, I am required to pay a 10% personal income tax on all earnings. 
                Therefore, a <strong>10% tax fee</strong> will be added on top of the total invoice amount. 
                This helps me stay compliant with local tax laws while continuing to provide quality work 
                as an independent creator.
              </en>
              <vi>
                As a Freelancer in Vietnam, I am required to pay a 10% personal income tax on all earnings. 
                Therefore, a <strong>10% tax fee</strong> will be added on top of the total invoice amount. 
                This helps me stay compliant with local tax laws while continuing to provide quality work 
                as an independent creator.
              </vi>
            </T>
          </p>
        </div>

        {/* Copyright & Usage Rights */}
        <div id="copyright" className="mb-8 scroll-mt-4">
          <h3 
            className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} mb-4`}
            style={{ 
              color: CONFIG.sectionHeader.color,
              paddingLeft: CONFIG.sectionHeader.paddingX,
              paddingRight: CONFIG.sectionHeader.paddingX,
            }}
          >
            <T>
              <en>Copyright & Usage Rights</en>
              <vi>Copyright & Usage Rights</vi>
            </T>
          </h3>
          
          <div 
            className={CONFIG.highlightBox.marginBottom}
            style={{ 
              backgroundColor: CONFIG.highlightBox.backgroundColor,
              borderRadius: CONFIG.highlightBox.borderRadius,
              paddingTop: CONFIG.highlightBox.paddingTop,
              paddingBottom: CONFIG.highlightBox.paddingBottom,
              paddingLeft: CONFIG.highlightBox.paddingX,
              paddingRight: CONFIG.highlightBox.paddingX,
            }}
          >
            <p style={{ color: CONFIG.bodyText.color }}>
              <T>
                <en>Required credit: <strong>"Dan @dansenak249"</strong> in Developer section.</en>
                <vi>Required credit: <strong>"Dan @dansenak249"</strong> in Developer section.</vi>
              </T>
            </p>
            <p className="mt-2" style={{ color: CONFIG.bodyText.color }}>
              <T>
                <en>There's nothing more here, you can do what ever you want even monetizing your game ヾ(≧▽≦*)o.</en>
                <vi>There's nothing more here, you can do what ever you want even monetizing your game ヾ(≧▽≦*)o.</vi>
              </T>
            </p>
          </div>

          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Developer Rights</en>
              <vi>🔸 Developer Rights</vi>
            </T>
          </h4>
          <ul 
            className={`${CONFIG.list.spacing} list-disc list-inside`}
            style={{ 
              color: CONFIG.list.textColor,
              paddingLeft: CONFIG.list.indentLeft
            }}
          >
            <li>
              <T>
                <en>
                  <strong>Self-promotion.</strong> I may post finished game video/capture on my social media 
                  or use it in my portfolio unless marked as a private commission.
                </en>
                <vi>
                  <strong>Self-promotion.</strong> I may post finished game video/capture on my social media 
                  or use it in my portfolio unless marked as a private commission.
                </vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  I reserve the right to cancel the commission and issue a refund if the client is 
                  disrespectful or places unfair demands.
                </en>
                <vi>
                  I reserve the right to cancel the commission and issue a refund if the client is 
                  disrespectful or places unfair demands.
                </vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  I may slightly adjust the layout or style during the process for better quality, 
                  as long as it aligns with the original brief.
                </en>
                <vi>
                  I may slightly adjust the layout or style during the process for better quality, 
                  as long as it aligns with the original brief.
                </vi>
              </T>
            </li>
            <li>
              <T>
                <en>Other copyright to which I am entitled under international law.</en>
                <vi>Other copyright to which I am entitled under international law.</vi>
              </T>
            </li>
          </ul>
        </div>
      </section>

      {/* Call to Action */}
      <div 
        className={CONFIG.ctaBox.marginTop}
        style={{ 
          background: `linear-gradient(to right, ${CONFIG.ctaBox.backgroundGradient.replace('from-', '').replace(' to-', ', ')})`,
          borderRadius: CONFIG.ctaBox.borderRadius,
          paddingTop: CONFIG.ctaBox.paddingTop,
          paddingBottom: CONFIG.ctaBox.paddingBottom,
          paddingLeft: CONFIG.ctaBox.paddingX,
          paddingRight: CONFIG.ctaBox.paddingX,
          textAlign: 'center'
        }}
      >
        <h3 
          className={`${CONFIG.ctaBox.titleSize} ${CONFIG.ctaBox.titleWeight} ${CONFIG.ctaBox.titleMarginBottom}`}
          style={{ color: CONFIG.ctaBox.titleColor }}
        >
          <T>
            <en>Ready to build your dream game?</en>
            <vi>Ready to build your dream game?</vi>
          </T>
        </h3>
        <p 
          className={`${CONFIG.ctaBox.textSize} ${CONFIG.ctaBox.textMarginBottom}`}
          style={{ color: CONFIG.ctaBox.textColor }}
        >
          <T>
            <en>Let's discuss your game idea and bring it to life!</en>
            <vi>Let's discuss your game idea and bring it to life!</vi>
          </T>
        </p>
        <p 
          className={CONFIG.ctaBox.accentWeight}
          style={{ color: CONFIG.ctaBox.accentColor }}
        >
          <T>
            <en>Contact me via any platform in my Profile</en>
            <vi>Contact me via any platform in my Profile</vi>
          </T>
        </p>
      </div>
    </div>
  )
}

export default CmsGamedev