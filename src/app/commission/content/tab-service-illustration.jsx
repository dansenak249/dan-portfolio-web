// src/app/commission/content/tab-service-illustration.jsx
const ServiceIllustration = ({ language }) => {
  const T = ({ children }) => {
    const childArray = Array.isArray(children) ? children : [children];
    for (const child of childArray) {
      if (child?.type === language) return child.props.children;
    }
    return childArray[0]?.props?.children;
  };
  const en = ({ children }) => children;
  const vi = ({ children }) => children;

  // --- CONFIGURATION SECTION ---
  const CONFIG = {
    padding: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    spacing: { subToHeader: 'mb-1', headerToBody: 'mb-2' },
    subheader: { size: 'text-base', color: '#06b6d4', weight: 'font-medium' },
    header: { size: 'text-2xl', color: '#ff6caf', weight: 'font-bold' },
    body: { size: 'text-sm', color: '#a7a7a7', weight: 'font-normal' }
  };

  // FIX: Use inline style for HEX colors instead of className
  const ContentLayout = ({ sub, head, body }) => (
    <div style={{ padding: `${CONFIG.padding.top} ${CONFIG.padding.right} ${CONFIG.padding.bottom} ${CONFIG.padding.left}` }}>
      <div 
        className={`${CONFIG.subheader.size} ${CONFIG.subheader.weight} ${CONFIG.spacing.subToHeader}`}
        style={{ color: CONFIG.subheader.color }}
      >
        {sub}
      </div>
      <div 
        className={`${CONFIG.header.size} ${CONFIG.header.weight} ${CONFIG.spacing.headerToBody}`}
        style={{ color: CONFIG.header.color }}
      >
        {head}
      </div>
      <div 
        className={`${CONFIG.body.size} ${CONFIG.body.weight}`}
        style={{ color: CONFIG.body.color }}
      >
        {body}
      </div>
    </div>
  );

  return (
    <T>
      <en>
        <ContentLayout 
          sub="Photoshop | Spine2D"
          head="Animated Illustration"
          body="Make your ideas into vibrant art brought to life with mesmerizing animations and magical FX ヾ(≧▽≦*)o."
        />
      </en>
      <vi>
        <ContentLayout 
          sub="Photoshop | Spine2D"
          head="Animated Illustration"
          body="Biến ý tưởng của cậu thành những bức tranh sống động với animation đầy màu sắc và hiệu ứng mê hoặc ヾ(≧▽≦*)o."
        />
      </vi>
    </T>
  );
};

export default ServiceIllustration