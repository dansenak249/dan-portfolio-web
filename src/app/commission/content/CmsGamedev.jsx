




// ============================================================
// src/app/commission/content/CmsGamedev.jsx

const CmsGamedev = ({ language }) => {
  const content = {
    en: (
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-[#7978e6] mb-6">
          Game Development Services
        </h1>

        <h2 className="text-2xl font-bold text-[#ff69b4] mt-8 mb-4">
          What I Offer
        </h2>
        
        <ul className="list-disc list-inside space-y-2 text-[#a7a7a7]">
          <li>Unity & Unreal Engine Development</li>
          <li>Gameplay Programming (C#, C++)</li>
          <li>Technical Art & Shader Development</li>
          <li>VFX & Particle Systems</li>
          <li>Performance Optimization</li>
        </ul>

        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <h3 className="text-xl font-bold text-[#7978e6] mb-2">
            Ready to build your game?
          </h3>
          <p className="text-[#a7a7a7]">
            Let's discuss your game development needs!
          </p>
        </div>
      </div>
    ),
    vi: (
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-[#7978e6] mb-6">
          Dịch vụ Phát triển Game
        </h1>

        <h2 className="text-2xl font-bold text-[#ff69b4] mt-8 mb-4">
          Những gì tôi cung cấp
        </h2>
        
        <ul className="list-disc list-inside space-y-2 text-[#a7a7a7]">
          <li>Phát triển Unity & Unreal Engine</li>
          <li>Lập trình Gameplay (C#, C++)</li>
          <li>Technical Art & Shader Development</li>
          <li>VFX & Particle Systems</li>
          <li>Tối ưu hiệu năng</li>
        </ul>

        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <h3 className="text-xl font-bold text-[#7978e6] mb-2">
            Sẵn sàng xây dựng game của bạn?
          </h3>
          <p className="text-[#a7a7a7]">
            Hãy thảo luận về nhu cầu phát triển game!
          </p>
        </div>
      </div>
    )
  }

  return content[language] || content.en
}

export default CmsGamedev