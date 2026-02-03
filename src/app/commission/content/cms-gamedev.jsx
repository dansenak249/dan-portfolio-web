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
              Cậu có idea game cực ngầu, một bé OC cực dễ huông,
              hay cả một thế giới mê hoặc trong đầu mà không thể lôi hết ra ngoài bằng viết hay vẽ,
              và đang tìm kiếm một cách kể chuyện khác? 
            </vi>
          </T>
        </p>
      </div>

      {/* Header Image - Featured image for the article */}


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
                <vi>Về việc làm game</vi>
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
                    <vi>Làm game có khó như giang hồ đồn thổi không?</vi>
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
                    <vi>Quy trình làm việc</vi>
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
                    <vi>Chi phí viết game</vi>
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
                <vi>Điều khoản và Dịch vụ</vi>
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
                    <vi>Thông tin liên hệ</vi>
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
                    <vi>Thanh toán & Hoàn tiền</vi>
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
                    <vi>Bản quyền và Quyền sử dụng</vi>
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
            <vi>Về việc làm game</vi>
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
              <vi>🔸 Làm game có khó như giang hồ đồn thổi không?</vi>
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
                  Ừ thì công nhận là khó thật ~(&#62;_&#60;。)＼.
                  Dù giờ đã là 2026, kể cả khi các công cụ và thư viện làm game phổ biến như Unity / Unreal đều đã phổ cập đến cấp sinh viên,
                  giờ AI viết code cũng rất ngon như là ChatGPT hay Claude Code,
                  việc tự build một con game vẫn là một thách thức lớn nếu tự làm solo.
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
                  Việc lập trình game thực ra không đơn giản như bề ngoài, kiểu cứ có tranh vẽ rồi viết vài dòng cho nó cử động là xong. 
                  Coi như bỏ qua luôn phần code, quy trình vẫn rất gắt gao về nhiều mảng kết hợp với nhau, 
                  từ việc thiết kế game mechanic, thiết kế minh hoạ nhân vật và background, làm animation cho chúng nó rồi chưa kể làm giao diện và hiệu ứng nữa,.. 
                  đó là chưa nói đến việc build cốt truyện và thế giới trong game. 
                  Thậm chí đối với tớ, một người có background là sinh viên phần mềm, tự học art và đi làm trong ngành cũng ngót nghét 3 năm, 
                  để mà tự một mình làm ra được con game nhỏ hoàn thiện cũng gần như không khả thi nếu không có sự giúp đỡ từ anh em bạn bè và đồng nghiệp.
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
                  Bởi vì nó khó vậy, tớ có rất nhiều người bạn cũng chơi chả ốc với mấy quả world building to đùng, 
                  và chúng nó rất muốn làm mấy game nhỏ liên quan như một cách kể chuyện mới, mà không tài nào tự xử được. 
                  Do vậy tớ và anh em cùng team quyết định mở com này với cộng đồng.
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
                  Tớ sẽ bắt đầu vào việc chỉ khi đã có đầy đủ <strong>Game Design Document</strong>, 
                  cùng với toàn bộ <strong>Assets</strong> (gồm art hoặc model, animation, âm thanh, UI và hiệu ứng nếu cần).
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
                  Trong quá trình làm việc, <strong>Asset có thể thay đổi thoải mái</strong>
                  (within permitted limits) vô số lần. 
                  Tuy nhiên ngược lại, việc thay đổi Game Design là tối kỵ bởi sẽ ảnh hưởng tới toàn bộ cấu trúc game.
                  Thực ra nếu cậu cần sửa thì tớ vẫn sẽ sửa thôi =)) nhưng mà làm vậy hoài tớ mệt lắm huhu ≧ ﹏ ≦.
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
            <vi>🔸 Chi phí viết game</vi>
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
                The price below only includes technical services (game programming, environment setup, 
                interface integration, graphics optimization…). <strong>It does not include</strong> Game 
                Design, Illustration, Animation, BGM / SFX or Visual FX…
              </en>
              <vi>
                Giá bên dưới chỉ bao gồm các mảng kỹ thuật (lập trình, setup môi trường, tích hợp giao diện responsive, tối ưu đồ hoạ,..).
                <strong>Không bao gồm </strong>
                Game Design, Minh hoạ, Animation, Âm thanh hay hiệu ứng...
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
                  $100
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
                  $800
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
                  Visual Novel
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
                  $200
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
                <td 
                  className={`text-center ${CONFIG.priceTable.cellPadding}`}
                  style={{ 
                    borderWidth: CONFIG.priceTable.borderWidth,
                    borderColor: CONFIG.priceTable.borderColor,
                    borderStyle: 'solid',
                    color: CONFIG.priceTable.cellTextColor
                  }}
                >
                  $1400
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
              Bên trên là giá ước tính, bởi các game có sự khác biệt rất lớn về độ dài lẫn độ phức tạp. 
              Giá trên chung cho cả thương mại và phi thương mại.
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
              <vi>ĐIỀU KHOẢN VÀ DỊCH VỤ</vi>
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
                Đặt com đồng nghĩa với việc đồng ý với các điều khoản bên dưới. 
                Cậu hãy đọc thật kỹ để chúng mình có một kỳ hợp tác ngon nghẻ nhé.
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
              <vi>Thông tin liên hệ</vi>
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
                <vi>Cậu nhắn cho tớ qua bất kỳ trang nào tớ để trên Profile đều được.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  My active hours are <strong>20:00-23:59 UTC+7</strong>, and I usually reply within 24 hours.
                </en>
                <vi>
                  Tớ sẽ hoạt động vào khoảng <strong>20:00-23:59 UTC+7</strong>, và thường sẽ phản hồi đầy đủ trong 24h.
                </vi>
              </T>
            </li>
            <li>
              <T>
                <en>If you pay via PayPal, I'll send you a proper invoice to keep things secure and organized.</en>
                <vi>Thanh toán: dòng này bên EN là Paypal nhưng tụi mình Việt cả mà, Banking nhé UwU</vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  When placing your order, please include: <strong>Game Design Document</strong> and full <strong>Assets</strong>.
                </en>
                <vi>
                  Khi cậu đặt com, đừng quên gửi đầy đủ <strong>Game Design Document</strong> và full <strong>Assets</strong>.
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
              <vi>Thanh toán & Hoàn tiền </vi>
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
              <vi>🔸 Về giá cả</vi>
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
                <en>Prices above are both non-commercial & commercial purpose.</en>
                <vi>Giá niêm yết bên trên sử dụng cho cả thương mại và phi thương mại</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Private commission comes with 50% Fee.</en>
                <vi>Phí private là 50% tổng đơn.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Prices may be changed due to complexity of commission.</en>
                <vi>Giá có thể thay đổi dựa vào độ dài hoặc phức tạp của brief.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Short/rush deadline must have to be charged around 50-100% Total Price, depending on your brief.</en>
                <vi>Dí deadline gấp quá tớ sẽ charge thêm 50-100% tổng phí ạ.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>Commission prices may be updated regularly without prior notice.</en>
                <vi>Như thường lệ, giá com có thể được update thường xuyên mà không báo trước.</vi>
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
              <vi>🔸 Về thanh toán</vi>
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
                <en>For large projects, we can split it into 2 payments upon agreement.</en>
                <vi>Với dự án cỡ bự kiểu này, mình sẽ chia làm 2 phần thanh toán nhé.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>PayPal only. I don't accept other payment methods.</en>
                <vi>Chỉ Paypal/Banking, tớ không giao dịch bằng thẻ hay các phương thức gián tiếp khác.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>I will hold your slot for 7 days after confirmation. If no payment is made, the slot will be released.</en>
                <vi>Tớ sẽ hold slot của cậu trong một tuần sau khi nhận việc, sau đó nếu cậu không cọc tớ xin phép huỷ slot ạ.</vi>
              </T>
            </li>
            <li>
              <T>
                <en>
                  If you send the wrong amount or there's a payment error, I'll do my best to help. 
                  However, I'm not responsible for incorrect PayPal emails.
                </en>
                <vi>
                  Nếu cậu có lỡ chuyển nhầm lượng tiền, tớ sẽ làm hết sức để giúp cậu. 
                  Tuy nhiên tớ sẽ không chịu trách nhiệm cho case chuyền nhầm cho người khác ạ.
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
              <vi>🔸 Về hoàn tiền</vi>
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
                <vi>100% nếu tớ chưa bắt đầu làm và cậu muốn huỷ (không gồm phụ phí Paypal).</vi>
              </T>
            </li>
            <li>
              <T>
                <en>50% if I've done <strong>Visual & Interaction</strong> and started <strong>Core System</strong>.</en>
                <vi>50% nếu tớ đã làm xong phần Visual & Interaction (hiểu là Front-end cũng được).</vi>
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
              <vi>Bản quyền và Quyền sử dụng</vi>
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
                <vi>Chỉ cần credit: <strong>"Dan @dansenak249"</strong> ở mục Developer.</vi>
              </T>
            </p>
            <p className="mt-2" style={{ color: CONFIG.bodyText.color }}>
              <T>
                <en>There's nothing more here, you can do what ever you want even monetizing your game ヾ(≧▽≦*)o.</en>
                <vi>Không còn gì đặc biệt ở đây nữa, cậu có thể làm gì cũng được kể cả mang game đi bán ヾ(≧▽≦*)o.</vi>
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
                  <strong>Self-promotion.</strong> tớ có thể post ảnh / video của game trên các trang cá nhân 
                  hoặc sử dụng nó trong portfolio của mình với chú thích về role, trừ khi cậu đặt private.
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
                  Tớ có quyền huỷ com và hoàn tiền nếu khách hàng có thái độ hoặc đưa ra những yêu cầu không phù hợp.
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
                  Tớ có thể thay đổi nhẹ một chút trong quá trình làm việc để đảm bảo chất lượng, 
                  tất nhiên là vẫn đi theo brief ban đầu.
                </vi>
              </T>
            </li>
            <li>
              <T>
                <en>Other copyright to which I am entitled under international law.</en>
                <vi>Các luật bản quyền khác dựa theo luật pháp quốc gia và quốc tế.</vi>
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
            <vi>Làm con game thôi các con vợ!</vi>
          </T>
        </h3>
        <p 
          className={`${CONFIG.ctaBox.textSize} ${CONFIG.ctaBox.textMarginBottom}`}
          style={{ color: CONFIG.ctaBox.textColor }}
        >
          <T>
            <en>Let's discuss your game idea and bring it to life!</en>
            <vi>Đừng quá lo lắng nếu cậu còn nhiều băn khoăn</vi>
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

export default CmsGamedev