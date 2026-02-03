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
                $190
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
                $290
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
                $50
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
                $110
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
                $170
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
                $35
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
                $80
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
                $20
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
                $45
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
              Payment & Refund Policy
            </button>.
          </en>
          <vi>
            Xem thêm ở{' '}
            <button 
              onClick={() => scrollToSection('payment')}
              className="transition-colors underline"
              style={{ color: CONFIG.tableOfContents.linkColor }}
              onMouseEnter={(e) => e.target.style.color = CONFIG.tableOfContents.linkHoverColor}
              onMouseLeave={(e) => e.target.style.color = CONFIG.tableOfContents.linkColor}
            >
              Thanh toán và Hoàn tiền
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
            <vi>ĐIỀU KHOẢN VÀ DỊCH VỤ</vi>
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
              Đặt com đồng nghĩa với việc đồng ý với các điều khoản bên dưới. 
              Cậu hãy đọc thật kỹ để chúng mình có một kỳ hợp tác ngon nghẻ nhé.
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
            <vi>Mục Lục</vi>
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
                <vi>Quy trình làm việc</vi>
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
                <vi>Thông tin liên hệ</vi>
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
                <vi>Thanh toán và Hoàn tiền</vi>
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
                <vi>Bản quyền và Quyền sử dụng</vi>
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
            <vi>Quy trình làm việc</vi>
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
                  Tớ sẽ gửi cậu một vài bản sketch dựa trên brief. Ở đoạn này cậu có thể chỉnh sửa thoải mái.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  Extra fee would be charged from your 4th change or if you need another different sketch option.
                </en>
                <vi>
                  Tớ sẽ chỉ thêm phí nếu cậu muốn thêm cái sketch nữa, hoặc sửa tới lui đến lần thứ 4 đổ đi.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  On Rendering steps, major changes are not available.
                </en>
                <vi>
                  Khi đã vào render, tớ chỉ có thể sửa tiểu tiết, nên hãy check sketch thật kỹ nhé.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  I don't accept vague feedback like "make it cuter" or "cooler" unless it's explained clearly. 
                  Please give specific instructions, e.g. "change the star to a heart" or "add a bow."
                </en>
                <vi>
                  Tớ sẽ không nhận feedback chung chung kiểu "bồ cho nó dễ huông hơn được khôm?" hay kiểu "cho nó ngầu hơn cậu nhé". 
                  Hãy diễn giải nó thật rõ ràng với yêu cầu cụ thể như kiểu "thay phụ kiện ngôi sao này thành hình trái tym" hoặc là "cho nó thêm cây cung" nhá.
                </vi>
              </T>
            </p>
            <p className={CONFIG.bodyText.marginBottom}>
              <T>
                <en>
                  If I don't receive feedback within 4 days, I'll move forward with the current version and no further changes will be accepted.
                </en>
                <vi>
                  Nếu tớ không nhận được phản hồi nào trong vòng 4 ngày, tớ sẽ tiếp tục làm việc với phiên bản hiện tại.
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
                Nếu cậu cần file hoặc định dạng đặc biệt khác, hãy nhắn tớ để trao đổi.
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
              <vi>🔸 Thời gian</vi>
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
                <vi>Tổng thời gian làm việc: 60 ngày kể từ khi nhận brief hoàn chỉnh.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Longest update time: At least once a week.</en>
                <vi>Thời gian dài nhất giữa các lần update: 1 tuần.</vi>
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
            <vi>Thông tin liên hệ</vi>
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
                Cậu nhắn cho tớ qua bất kỳ trang nào tớ để trên Profile đều được. Nếu là com Illustration, tớ recommend{' '}
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
              <vi>Tớ sẽ hoạt động vào khoảng <strong>20:00-23:59 UTC+7</strong>, và thường sẽ phản hồi đầy đủ trong 24h.</vi>
            </T>
          </p>
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>If you pay via PayPal, I'll send you a proper invoice to keep things secure and organized.</en>
              <vi>Thanh toán: dòng này bên EN là Paypal nhưng tụi mình Việt cả mà, Banking nhé UwU.</vi>
            </T>
          </p>
          <p className={CONFIG.bodyText.marginBottom}>
            <T>
              <en>When placing your order, please include: Image refs, pose/emotion, canvas size, deadline (if any), and usage purpose.</en>
              <vi>Khi đặt com, hãy gửi đầy đủ: Ảnh refs, pose và biểu cảm, kích thước khổ giấy, deadline (nếu có) và mục đích sử dụng.</vi>
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
            <vi>Thanh toán & Hoàn tiền</vi>
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
              <vi>🔸 Về giá cả</vi>
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
                <vi>Giá niêm yết ở trên là giá phi thương mại. Phí thương mại sẽ x2-3 tổng giá tuỳ mục đích.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Private commission comes with 50% Fee.</en>
                <vi>Phí Private là 50% tổng đơn.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Prices may be changed due to complexity of commission.</en>
                <vi>Giá có thể thay đổi dựa vào độ dài hoặc phức tạp của brief.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Short/rush deadline must have to be charged around 50-100% Total Price, depending on your brief.</en>
                <vi>Dí deadline gấp quá tớ sẽ charge thêm 50-100% tổng phí ạ.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Commission prices may be updated regularly without prior notice.</en>
                <vi>Như thường lệ, giá com có thể được update thường xuyên mà không báo trước.</vi>
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
              <vi>🔸 Về thanh toán</vi>
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
                <vi>Thanh toán 100% trước khi tớ bắt đầu làm việc. Với các dự án lớn, mình có thể chia làm 2 phần thanh toán.</vi>
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
                  , Paypal hoặc Banking. Tớ không dùng các phương thức khác.
                </vi>
              </T>
            </p>
            <p>
              <T>
                <en>I will hold your slot for 7 days after confirmation. If no payment is made, the slot will be released.</en>
                <vi>Tớ sẽ hold slot của cậu trong một tuần sau khi nhận việc, sau đó nếu cậu không cọc tớ xin phép huỷ slot ạ.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>If you send the wrong amount or there's a payment error, I'll do my best to help. However, I'm not responsible for incorrect PayPal emails.</en>
                <vi>Nếu cậu có lỡ chuyển nhầm lượng tiền, tớ sẽ làm hết sức để giúp cậu. Tuy nhiên tớ sẽ không chịu trách nhiệm cho case chuyền nhầm cho người khác ạ.</vi>
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
              <vi>🔸 Về hoàn tiền</vi>
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
                <vi>100% nếu tớ chưa bắt đầu làm và cậu muốn huỷ (không gồm phụ phí Paypal).</vi>
              </T>
            </p>
            <p>
              <T>
                <en>100% if I <strong>cannot complete</strong> the Artwork.</en>
                <vi>100% nếu tớ <strong>không thế hoàn thành</strong> tranh.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>50% if I've <strong>finished Sketchs</strong> and start Rendering.</en>
                <vi>50% nếu tớ đã <strong>hoàn thành Sketchs</strong> và bắt đầu Rendering.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>10% if I'm over <strong>1 days late</strong> without a valid reason. You can request a full refund, and I'll stop right away.</en>
                <vi>10% nếu tớ <strong>trễ quá 1 ngày</strong> mà không có lý do chính đáng. Cậu có thể yêu cầu hoàn tiền 100%, và tớ sẽ dừng com.</vi>
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
              <vi>🔸 Về thuế và phụ phí</vi>
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
                Là một Freelancer mẫu mực không trốn thuế, tớ có nghĩa vụ phải đóng 10% thu nhập cá nhân của mình. 
                Bởi vậy tớ xin phép cộng 10% phí được cộng thêm vào tổng com ạ. 
                Việc này giúp tớ yên tâm làm đơn của cậu hơn mà không sợ bị mời lên uống trà lúc dở việc.
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
            <vi>Bản quyền và Quyền sử dụng</vi>
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
              <vi>🔸 Với mục đích Phi thương mại</vi>
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
                <vi>Tớ giữ toàn bộ bản quyền của tác phẩm trừ khi có thỏa thuận chuyển nhượng (cần thêm phí).</vi>
              </T>
            </p>
            <p>
              <T>
                <en>You may use the commissioned art for personal use only: avatars, overlays, banners, etc.</en>
                <vi>Cậu chỉ được sử dụng cho mục đích cá nhân: avatars, overlays, banners, v.v.</vi>
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
                <vi>Cậu KHÔNG được</vi>
              </T>
            </p>
            <div className="space-y-1" style={{ color: CONFIG.warningBox.textColor }}>
              <p>
                <T>
                  <en><strong>Print or sell</strong> the artwork, or use it commercially without proper licensing</en>
                  <vi><strong>In hoặc bán</strong>, hoặc sử dụng cho mục đích thương mại mà không có sự đồng ý của tớ</vi>
                </T>
              </p>
              <p>
                <T>
                  <en>Repost without <strong>credit</strong></en>
                  <vi>Repost không <strong>credit</strong></vi>
                </T>
              </p>
              <p>
                <T>
                  <en>Use for <strong>AI/NFT/filter</strong> modifications, I do not allow my work to be used for AI training, AI blending, or filtered edits that distort the original intent.</en>
                  <vi>Dùng cho <strong>AI/NFT/filter</strong> chỉnh sửa, tớ không cho phép tranh của tớ được sử dụng cho AI training, blending hay chỉnh sửa làm thay đổi sự toàn vẹn của tác phẩm.</vi>
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
              <en>🔸 With Commercial Use</en>
              <vi>🔸 Với mục đích Thương mại</vi>
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
                <vi>Tính phí x2-3 so với giá cơ bản.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Required credit: "by Dan @dansenak249"</en>
                <vi>Có credit: "by Dan @dansenak249"</vi>
              </T>
            </p>
            <p>
              <T>
                <en>If you violate copyright, I reserve the right to file DMCA claims and publicly address the issue.</en>
                <vi>Nếu cậu vi phạm bản quyền, tớ có quyền khiếu nại DMCA claims và đăng bài công khai vấn đề này.</vi>
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
                <vi>Tớ có thể đăng ảnh / video lên các trang mạng xã hội hoặc sử dụng trong portfolio trừ khi cậu đặt đơn Private.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>I reserve the right to cancel the commission and issue a refund if the client is disrespectful or places unfair demands.</en>
                <vi>Tớ có quyền huỷ com và hoàn tiền nếu khách hàng có thái độ hoặc đưa ra những yêu cầu không phù hợp.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>I may slightly adjust the layout or style during the process for better quality, as long as it aligns with the original brief.</en>
                <vi>Tớ có thể điều chỉnh layout hoặc style trong quá trình làm để đạt chất lượng tốt hơn, miễn là phù hợp với yêu cầu ban đầu.</vi>
              </T>
            </p>
            <p>
              <T>
                <en>Other copyright to which I am entitled under international law.</en>
                <vi>Các luật bản quyền khác dựa theo luật pháp quốc gia và quốc tế.</vi>
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
            <vi>Làm con tranh thôi các con vợ</vi>
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
            <vi>Cậu có thể liên hệ với tớ qua bất kỳ nền tảng nào trong Profile nhé</vi>
          </T>
        </p>
      </div>
    </div>
  )
}

export default CmsIllustration