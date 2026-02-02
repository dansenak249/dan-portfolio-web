// src/app/commission/content/cms-illustration.jsx

import cmsImage1 from '../assets/cms/cms-illustration-1.webp'
import cmsHeaderImage from '../assets/cms/cms-illustration-header.webp'

const CmsIllustration = ({ language }) => {
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
      titleColor: '#7D6799',
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
      titleColor: '#7D6799',
      titleSize: 'text-2xl',
      titleWeight: 'font-bold',
      titleMarginBottom: 'mb-4',
      subtitleColor: '#7D6799',
      subtitleSize: 'text-base',
      subtitleStyle: 'italic',
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

    // Highlight Box (Green)
    highlightBox: {
      backgroundColor: '#d1fae5',
      borderRadius: '8px',
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingX: '16px',
      marginBottom: 'mb-4',
    },

    // Warning Box (Red)
    warningBox: {
      backgroundColor: '#fee2e2',
      borderRadius: '8px',
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingX: '16px',
      marginBottom: 'mb-4',
      textColor: '#C00000',
      boldColor: '#C00000',
    },

    // Price Table
    priceTable: {
      borderColor: '#B4C6E7',
      headerBorderColor: '#8EAADB',
      headerBackgroundColor: '#ffffff',
      headerTextColor: '#7D6799',
      cellBackgroundColor: '#ffffff',
      cellTextColor: '#7D6799',
      cellPadding: 'px-4 py-3',
      borderWidth: '1px',
      marginBottom: 'mb-6',
    },

    // Call to Action Box
    ctaBox: {
      backgroundGradient: 'from-pink-100 to-purple-100',
      borderRadius: '8px',
      paddingTop: '32px',
      paddingBottom: '32px',
      paddingX: '32px',
      marginTop: 'mt-12',
      titleColor: '#ff69b4',
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
            <en>ILLUSTRATION</en>
            <vi>ILLUSTRATION</vi>
          </T>
        </h1>
      </div>

      {/* Price Table - Main */}
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
                  borderBottomWidth: '2px',
                  borderBottomColor: CONFIG.priceTable.headerBorderColor,
                  borderStyle: 'solid',
                  color: CONFIG.priceTable.headerTextColor,
                  fontWeight: 'bold'
                }}
              >
              </th>
              <th 
                className={`text-center ${CONFIG.priceTable.cellPadding}`}
                style={{ 
                  borderWidth: CONFIG.priceTable.borderWidth,
                  borderColor: CONFIG.priceTable.borderColor,
                  borderBottomWidth: '2px',
                  borderBottomColor: CONFIG.priceTable.headerBorderColor,
                  borderStyle: 'solid',
                  color: CONFIG.priceTable.headerTextColor,
                  fontWeight: 'bold'
                }}
              >
                <T>
                  <en>Clean sketch</en>
                  <vi>Clean sketch</vi>
                </T>
              </th>
              <th 
                className={`text-center ${CONFIG.priceTable.cellPadding}`}
                style={{ 
                  borderWidth: CONFIG.priceTable.borderWidth,
                  borderColor: CONFIG.priceTable.borderColor,
                  borderBottomWidth: '2px',
                  borderBottomColor: CONFIG.priceTable.headerBorderColor,
                  borderStyle: 'solid',
                  color: CONFIG.priceTable.headerTextColor,
                  fontWeight: 'bold'
                }}
              >
                <T>
                  <en>Painting</en>
                  <vi>Painting</vi>
                </T>
              </th>
              <th 
                className={`text-center ${CONFIG.priceTable.cellPadding}`}
                style={{ 
                  borderWidth: CONFIG.priceTable.borderWidth,
                  borderColor: CONFIG.priceTable.borderColor,
                  borderBottomWidth: '2px',
                  borderBottomColor: CONFIG.priceTable.headerBorderColor,
                  borderStyle: 'solid',
                  color: CONFIG.priceTable.headerTextColor,
                  fontWeight: 'bold'
                }}
              >
                <T>
                  <en>Animated</en>
                  <vi>Animated</vi>
                </T>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Illustration + BG */}
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
                <T>
                  <en>Illustration + BG</en>
                  <vi>Illustration + BG</vi>
                </T>
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
                $250
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
                $400
              </td>
            </tr>

            {/* Full Body */}
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
                <T>
                  <en>Full Body</en>
                  <vi>Full Body</vi>
                </T>
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
                $70
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
                $150
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
                $250
              </td>
            </tr>

            {/* Half Body */}
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
                <T>
                  <en>Half Body</en>
                  <vi>Half Body</vi>
                </T>
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
                $40
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
                $90
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

            {/* Bust up */}
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
                <T>
                  <en>Bust up</en>
                  <vi>Bust up</vi>
                </T>
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
                $25
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
                $60
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
        className={CONFIG.bodyText.size}
        style={{ 
          color: CONFIG.bodyText.color,
          paddingLeft: CONFIG.bodyText.paddingX,
          paddingRight: CONFIG.bodyText.paddingX,
          marginBottom: '24px'
        }}
      >
        <T>
          <en>
            For further information, check{' '}
            <button 
              onClick={() => scrollToSection('payment')}
              className="transition-colors underline"
              style={{ color: CONFIG.tableOfContents.linkColor }}
              onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
              onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
            >
              Payment
            </button>.
          </en>
          <vi>
            For further information, check{' '}
            <button 
              onClick={() => scrollToSection('payment')}
              className="transition-colors underline"
              style={{ color: CONFIG.tableOfContents.linkColor }}
              onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
              onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
            >
              Payment
            </button>.
          </vi>
        </T>
      </p>

      {/* TERM OF SERVICE Header */}
      <div 
        className={CONFIG.headerSection.marginBottom}
        style={{ 
          backgroundColor: CONFIG.headerSection.backgroundColor,
          borderRadius: CONFIG.headerSection.borderRadius,
          paddingTop: CONFIG.headerSection.paddingTop,
          paddingBottom: '0px',
          paddingLeft: CONFIG.headerSection.paddingX,
          paddingRight: CONFIG.headerSection.paddingX,
        }}
      >
        <h1 
          className={`${CONFIG.headerSection.titleSize} ${CONFIG.headerSection.titleWeight} ${CONFIG.headerSection.titleMarginBottom}`}
          style={{ color: CONFIG.headerSection.titleColor }}
        >
          <T>
            <en>TERM OF SERVICE</en>
            <vi>TERM OF SERVICE</vi>
          </T>
        </h1>
        <p 
          className={`${CONFIG.headerSection.subtitleSize} ${CONFIG.headerSection.subtitleStyle}`}
          style={{ color: CONFIG.headerSection.subtitleColor }}
        >
          <T>
            <en>
              By placing a commission, you agree to the terms below. Please read everything carefully so we can have a smooth and magical collab!
            </en>
            <vi>
              By placing a commission, you agree to the terms below. Please read everything carefully so we can have a smooth and magical collab!
            </vi>
          </T>
        </p>
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
        <p 
          className={`${CONFIG.tableOfContents.subtitleSize} ${CONFIG.tableOfContents.subtitleStyle} mb-4`}
          style={{ color: CONFIG.tableOfContents.subtitleColor }}
        >
          <T>
            <en>Jump to a Section</en>
            <vi>Jump to a Section</vi>
          </T>
        </p>
        <ul className="space-y-2">
          <li>
            <button 
              onClick={() => scrollToSection('workprocess')}
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
          <li>
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
          <li>
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
          <li>
            <button 
              onClick={() => scrollToSection('copyright')}
              className="transition-colors"
              style={{ color: CONFIG.tableOfContents.linkColor }}
              onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
              onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
            >
              <T>
                <en>Copyright & Usage Rights</en>
                <vi>Copyright & Usage Rights</vi>
              </T>
            </button>
          </li>
        </ul>
      </div>

      {/* Work Process Section */}
      <section id="workprocess" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <h2 
          className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} ${CONFIG.sectionHeader.marginBottom}`}
          style={{ 
            color: CONFIG.sectionHeader.color,
            paddingLeft: CONFIG.sectionHeader.paddingX,
            paddingRight: CONFIG.sectionHeader.paddingX,
          }}
        >
          <T>
            <en>Work Process</en>
            <vi>Work Process</vi>
          </T>
        </h2>
        
        <div className="mb-6 scroll-mt-4">
          <h3 
            className={`${CONFIG.subHeader.size} ${CONFIG.subHeader.weight} ${CONFIG.subHeader.marginBottom}`}
            style={{ 
              color: CONFIG.subHeader.color,
              paddingLeft: CONFIG.subHeader.paddingX,
              paddingRight: CONFIG.subHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Workflow:</en>
              <vi>🔸 Workflow:</vi>
            </T>
          </h3>

          {/* Workflow Image */}
          <div className={CONFIG.image.marginY}>
            <img 
              src={cmsImage1.src} 
              alt="Illustration Workflow"
              className={`w-full ${CONFIG.image.maxWidth} mx-auto ${CONFIG.image.borderRadius} ${CONFIG.image.shadow}`}
            />
          </div>

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
                  Few Sketch options will be made base on your brief. Small fix could be proceed free until you satisfied.
                </en>
                <vi>
                  Few Sketch options will be made base on your brief. Small fix could be proceed free until you satisfied.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  Extra fee would be charged from your 4th change or if you need another different sketch option.
                </en>
                <vi>
                  Extra fee would be charged from your 4th change or if you need another different sketch option.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  On Rendering steps, major changes are not available.
                </en>
                <vi>
                  On Rendering steps, major changes are not available.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  I don't accept vague feedback like "make it cuter" or "cooler" unless it's explained clearly. Please give specific instructions, e.g. "change the star to a heart" or "add a bow."
                </en>
                <vi>
                  I don't accept vague feedback like "make it cuter" or "cooler" unless it's explained clearly. Please give specific instructions, e.g. "change the star to a heart" or "add a bow."
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  If I don't receive feedback within 4 days, I'll move forward with the current version and no further changes will be accepted.
                </en>
                <vi>
                  If I don't receive feedback within 4 days, I'll move forward with the current version and no further changes will be accepted.
                </vi>
              </T>
            </p>
          </div>
        </div>

        {/* File Section */}
        <div className="mb-6 scroll-mt-4">
          <h3 
            className={`${CONFIG.subHeader.size} ${CONFIG.subHeader.weight} ${CONFIG.subHeader.marginBottom}`}
            style={{ 
              color: CONFIG.subHeader.color,
              paddingLeft: CONFIG.subHeader.paddingX,
              paddingRight: CONFIG.subHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 File</en>
              <vi>🔸 File</vi>
            </T>
          </h3>

          {/* File Table */}
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
                      borderBottomWidth: '2px',
                      borderBottomColor: CONFIG.priceTable.headerBorderColor,
                      borderStyle: 'solid',
                      color: CONFIG.priceTable.headerTextColor,
                      fontWeight: 'bold'
                    }}
                  >
                  </th>
                  <th 
                    className={`text-center ${CONFIG.priceTable.cellPadding}`}
                    style={{ 
                      borderWidth: CONFIG.priceTable.borderWidth,
                      borderColor: CONFIG.priceTable.borderColor,
                      borderBottomWidth: '2px',
                      borderBottomColor: CONFIG.priceTable.headerBorderColor,
                      borderStyle: 'solid',
                      color: CONFIG.priceTable.headerTextColor,
                      fontWeight: 'bold'
                    }}
                  >
                    <T>
                      <en>Type</en>
                      <vi>Type</vi>
                    </T>
                  </th>
                  <th 
                    className={`text-center ${CONFIG.priceTable.cellPadding}`}
                    style={{ 
                      borderWidth: CONFIG.priceTable.borderWidth,
                      borderColor: CONFIG.priceTable.borderColor,
                      borderBottomWidth: '2px',
                      borderBottomColor: CONFIG.priceTable.headerBorderColor,
                      borderStyle: 'solid',
                      color: CONFIG.priceTable.headerTextColor,
                      fontWeight: 'bold'
                    }}
                  >
                    <T>
                      <en>Resolution (px)</en>
                      <vi>Resolution (px)</vi>
                    </T>
                  </th>
                  <th 
                    className={`text-center ${CONFIG.priceTable.cellPadding}`}
                    style={{ 
                      borderWidth: CONFIG.priceTable.borderWidth,
                      borderColor: CONFIG.priceTable.borderColor,
                      borderBottomWidth: '2px',
                      borderBottomColor: CONFIG.priceTable.headerBorderColor,
                      borderStyle: 'solid',
                      color: CONFIG.priceTable.headerTextColor,
                      fontWeight: 'bold'
                    }}
                  >
                    <T>
                      <en>Note</en>
                      <vi>Note</vi>
                    </T>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Illustration */}
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
                    <T>
                      <en>Illustration</en>
                      <vi>Illustration</vi>
                    </T>
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
                    PNG
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
                    3840 x 2160
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
                    350 DPI
                  </td>
                </tr>

                {/* Animation */}
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
                    <T>
                      <en>Animation</en>
                      <vi>Animation</vi>
                    </T>
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
                    MP4
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
                    1920 x 1080
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
                    60 FPS
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
                If you need another size or format, contact me for further discussion.
              </en>
              <vi>
                If you need another size or format, contact me for further discussion.
              </vi>
            </T>
          </p>
        </div>

        {/* Time Section */}
        <div className="mb-6 scroll-mt-4">
          <h3 
            className={`${CONFIG.subHeader.size} ${CONFIG.subHeader.weight} ${CONFIG.subHeader.marginBottom}`}
            style={{ 
              color: CONFIG.subHeader.color,
              paddingLeft: CONFIG.subHeader.paddingX,
              paddingRight: CONFIG.subHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Time</en>
              <vi>🔸 Time</vi>
            </T>
          </h3>
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>Total commission time: 60 days from Brief received day.</en>
                <vi>Total commission time: 60 days from Brief received day.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Longest update time: At least once a week.</en>
                <vi>Longest update time: At least once a week.</vi>
              </T>
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section id="contact" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <h2 
          className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} ${CONFIG.sectionHeader.marginBottom}`}
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
        </h2>
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
                I accept commision through any platform noted in my Profie. For Art Commissions, I recommend{' '}
                <a 
                  href="https://vgen.co/dansenak249" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                >
                  Vgen
                </a>.
              </en>
              <vi>
                I accept commision through any platform noted in my Profie. For Art Commissions, I recommend{' '}
                <a 
                  href="https://vgen.co/dansenak249" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: CONFIG.tableOfContents.linkColor }}
                >
                  Vgen
                </a>.
              </vi>
            </T>
          </p>
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>My active hours are 20:00-23:59 UTC+7, and I usually reply within 24 hours.</en>
              <vi>My active hours are 20:00-23:59 UTC+7, and I usually reply within 24 hours.</vi>
            </T>
          </p>
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>If you pay via PayPal, I'll send you a proper invoice to keep things secure and organized.</en>
              <vi>If you pay via PayPal, I'll send you a proper invoice to keep things secure and organized.</vi>
            </T>
          </p>
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>When placing your order, please include: Image refs, pose/emotion, canvas size, deadline (if any), and usage purpose.</en>
              <vi>When placing your order, please include: Image refs, pose/emotion, canvas size, deadline (if any), and usage purpose.</vi>
            </T>
          </p>
        </div>
      </section>

      {/* Payment & Refund Policy Section */}
      <section id="payment" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <h2 
          className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} ${CONFIG.sectionHeader.marginBottom}`}
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
        </h2>

        {/* Price */}
        <div className="mb-6">
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
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>Prices above are based on non-commercial purpose. Commercial Fees will be charge by Total Price x2-3 base on each purpose.</en>
                <vi>Prices above are based on non-commercial purpose. Commercial Fees will be charge by Total Price x2-3 base on each purpose.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Private commission comes with 50% Fee.</en>
                <vi>Private commission comes with 50% Fee.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Prices may be changed due to complexity of commission.</en>
                <vi>Prices may be changed due to complexity of commission.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Short/rush deadline must have to be charged around 50-100% Total Price, depending on your brief.</en>
                <vi>Short/rush deadline must have to be charged around 50-100% Total Price, depending on your brief.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Commission prices may be updated regularly without prior notice.</en>
                <vi>Commission prices may be updated regularly without prior notice.</vi>
              </T>
            </p>
          </div>
        </div>

        {/* Payment */}
        <div className="mb-6">
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
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>100% upfront payment is required before I start. For large projects, we can split it into 2 payments upon agreement.</en>
                <vi>100% upfront payment is required before I start. For large projects, we can split it into 2 payments upon agreement.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>
                  <a 
                    href="https://vgen.co/dansenak249" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: CONFIG.tableOfContents.linkColor }}
                  >
                    Vgen
                  </a>{' '}
                  or PayPal only. I don't accept other payment methods.
                </en>
                <vi>
                  <a 
                    href="https://vgen.co/dansenak249" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: CONFIG.tableOfContents.linkColor }}
                  >
                    Vgen
                  </a>{' '}
                  or PayPal only. I don't accept other payment methods.
                </vi>
              </T>
            </p>
            <p>
              <T>
                <en>I will hold your slot for 7 days after confirmation. If no payment is made, the slot will be released.</en>
                <vi>I will hold your slot for 7 days after confirmation. If no payment is made, the slot will be released.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>If you send the wrong amount or there's a payment error, I'll do my best to help. However, I'm not responsible for incorrect PayPal emails.</en>
                <vi>If you send the wrong amount or there's a payment error, I'll do my best to help. However, I'm not responsible for incorrect PayPal emails.</vi>
              </T>
            </p>
          </div>
        </div>

        {/* Refund */}
        <div className="mb-6">
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
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>100% if I <strong>haven't started</strong> working on your commission (not include the Paypal extra fee).</en>
                <vi>100% if I <strong>haven't started</strong> working on your commission (not include the Paypal extra fee).</vi>
              </T>
            </p>
            <p>
              <T>
                <en>100% if I <strong>cannot complete</strong> the Artwork.</en>
                <vi>100% if I <strong>cannot complete</strong> the Artwork.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>50% if I've <strong>finished Sketchs</strong> and start Rendering.</en>
                <vi>50% if I've <strong>finished Sketchs</strong> and start Rendering.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>10% if I'm over <strong>1 days late</strong> without a valid reason. You can request a full refund, and I'll stop right away.</en>
                <vi>10% if I'm over <strong>1 days late</strong> without a valid reason. You can request a full refund, and I'll stop right away.</vi>
              </T>
            </p>
          </div>
        </div>

        {/* Tax & Fee Notice */}
        <div className="mb-6">
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
      </section>

      {/* Copyright & Usage Rights Section */}
      <section id="copyright" className={CONFIG.sectionSpacing.marginBottom + " scroll-mt-4"}>
        <h2 
          className={`${CONFIG.sectionHeader.size} ${CONFIG.sectionHeader.weight} ${CONFIG.sectionHeader.marginBottom}`}
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
        </h2>

        {/* Without Commercial Use */}
        <div className="mb-6">
          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Without Commersial Use</en>
              <vi>🔸 Without Commersial Use</vi>
            </T>
          </h4>
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>I retain full copyright of the artwork unless a transfer is agreed upon (additional fee required).</en>
                <vi>I retain full copyright of the artwork unless a transfer is agreed upon (additional fee required).</vi>
              </T>
            </p>
            <p>
              <T>
                <en>You may use the commissioned art for personal use only: avatars, overlays, banners, etc.</en>
                <vi>You may use the commissioned art for personal use only: avatars, overlays, banners, etc.</vi>
              </T>
            </p>
          </div>

          {/* Warning Box - You may NOT */}
          <div 
            className={CONFIG.warningBox.marginBottom}
            style={{ 
              backgroundColor: CONFIG.warningBox.backgroundColor,
              borderRadius: CONFIG.warningBox.borderRadius,
              paddingTop: CONFIG.warningBox.paddingTop,
              paddingBottom: CONFIG.warningBox.paddingBottom,
              paddingLeft: CONFIG.warningBox.paddingX,
              paddingRight: CONFIG.warningBox.paddingX,
              marginTop: '16px'
            }}
          >
            <p className="font-bold mb-2" style={{ color: CONFIG.warningBox.boldColor }}>
              <T>
                <en>You may NOT</en>
                <vi>You may NOT</vi>
              </T>
            </p>
            <div className="space-y-1" style={{ color: CONFIG.warningBox.textColor }}>
              <p>
                <T>
                  <en><strong>Print or sell</strong> the artwork, or use it commercially without proper licensing</en>
                  <vi><strong>Print or sell</strong> the artwork, or use it commercially without proper licensing</vi>
                </T>
              </p>
              <p>
                <T>
                  <en>Repost without <strong>credit</strong></en>
                  <vi>Repost without <strong>credit</strong></vi>
                </T>
              </p>
              <p>
                <T>
                  <en>Use for <strong>AI/NFT/filter</strong> modifications, I do not allow my work to be used for AI training, AI blending, or filtered edits that distort the original intent.</en>
                  <vi>Use for <strong>AI/NFT/filter</strong> modifications, I do not allow my work to be used for AI training, AI blending, or filtered edits that distort the original intent.</vi>
                </T>
              </p>
            </div>
          </div>
        </div>

        {/* With Commercial Use */}
        <div className="mb-6">
          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 With Commersial Use</en>
              <vi>🔸 With Commersial Use</vi>
            </T>
          </h4>
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>Requires an additional x2-3 of the base price.</en>
                <vi>Requires an additional x2-3 of the base price.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Required credit: "by Dan @dansenak249"</en>
                <vi>Required credit: "by Dan @dansenak249"</vi>
              </T>
            </p>
            <p>
              <T>
                <en>If you violate copyright, I reserve the right to file DMCA claims and publicly address the issue.</en>
                <vi>If you violate copyright, I reserve the right to file DMCA claims and publicly address the issue.</vi>
              </T>
            </p>
          </div>
        </div>

        {/* Artist Rights */}
        <div className="mb-6">
          <h4 
            className={`${CONFIG.smallHeader.size} ${CONFIG.smallHeader.weight} ${CONFIG.smallHeader.marginBottom}`}
            style={{ 
              color: CONFIG.smallHeader.color,
              paddingLeft: CONFIG.smallHeader.paddingX,
              paddingRight: CONFIG.smallHeader.paddingX,
            }}
          >
            <T>
              <en>🔸 Artist Rights</en>
              <vi>🔸 Artist Rights</vi>
            </T>
          </h4>
          <div 
            className={`space-y-2 ${CONFIG.bodyText.size} ${CONFIG.bodyText.lineHeight}`}
            style={{ 
              color: CONFIG.bodyText.color,
              paddingLeft: CONFIG.bodyText.paddingX,
              paddingRight: CONFIG.bodyText.paddingX,
            }}
          >
            <p>
              <T>
                <en>Self-promotion. I may post finished artwork on my social media or use it in my portfolio unless marked as a private commission.</en>
                <vi>Self-promotion. I may post finished artwork on my social media or use it in my portfolio unless marked as a private commission.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>I reserve the right to cancel the commission and issue a refund if the client is disrespectful or places unfair demands.</en>
                <vi>I reserve the right to cancel the commission and issue a refund if the client is disrespectful or places unfair demands.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>I may slightly adjust the layout or style during the process for better quality, as long as it aligns with the original brief.</en>
                <vi>I may slightly adjust the layout or style during the process for better quality, as long as it aligns with the original brief.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Other copyright to which I am entitled under international law.</en>
                <vi>Other copyright to which I am entitled under international law.</vi>
              </T>
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <div 
        className={CONFIG.ctaBox.marginTop}
        style={{ 
          background: 'linear-gradient(to right, #fce7f3, #f3e8ff)',
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
            <en>Ready to bring your vision to life?</en>
            <vi>Ready to bring your vision to life?</vi>
          </T>
        </h3>
        <p 
          className={`${CONFIG.ctaBox.textSize} ${CONFIG.ctaBox.textMarginBottom}`}
          style={{ color: CONFIG.ctaBox.textColor }}
        >
          <T>
            <en>Let's create something magical together!</en>
            <vi>Let's create something magical together!</vi>
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

export default CmsIllustration