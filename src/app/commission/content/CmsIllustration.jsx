const CmsIllustration = ({ language }) => {
  const content = {
    en: (
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-[#ff69b4] mb-6">
          Animated Illustration Services
        </h1>

        {/* Can use images easily! */}
        <div className="my-8">
          <img 
            src="/app/commission/assets/cms/cms-illustration-1.png" 
            alt="Illustration example"
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <h2 className="text-2xl font-bold text-[#7978e6] mt-8 mb-4">
          What I Offer
        </h2>
        
        <ul className="list-disc list-inside space-y-2 text-[#a7a7a7]">
          <li>Character Design & Illustration</li>
          <li>2D Frame-by-frame Animation</li>
          <li>Live2D Rigging & Animation</li>
          <li>VTuber Model Creation</li>
          <li>Animated Emotes & Stickers</li>
        </ul>

        <h2 className="text-2xl font-bold text-[#7978e6] mt-8 mb-4">
          Process
        </h2>
        
        <div className="space-y-4 text-[#a7a7a7]">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-[#ff69b4]">1. Consultation</h3>
            <p>We discuss your vision, style preferences, and requirements.</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-[#ff69b4]">2. Sketch & Draft</h3>
            <p>Initial sketches and concept art for your approval.</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-[#ff69b4]">3. Animation</h3>
            <p>Final artwork with smooth, professional animation.</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
          <h3 className="text-xl font-bold text-[#7978e6] mb-2">
            Ready to bring your ideas to life?
          </h3>
          <p className="text-[#a7a7a7]">
            Contact me to discuss your project and get a custom quote!
          </p>
        </div>
      </div>
    ),

    vi: (
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-[#ff69b4] mb-6">
          Dịch vụ Minh họa Hoạt hình
        </h1>

        <div className="my-8">
          <img 
            src="/app/commission/assets/cms/cms-illustration-1.png"
            alt="Ví dụ minh họa"
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <h2 className="text-2xl font-bold text-[#7978e6] mt-8 mb-4">
          Những gì tôi cung cấp
        </h2>
        
        <ul className="list-disc list-inside space-y-2 text-[#a7a7a7]">
          <li>Thiết kế & Minh họa Nhân vật</li>
          <li>Animation 2D từng khung hình</li>
          <li>Rigging & Animation Live2D</li>
          <li>Tạo Model VTuber</li>
          <li>Emote & Sticker động</li>
        </ul>

        <h2 className="text-2xl font-bold text-[#7978e6] mt-8 mb-4">
          Quy trình làm việc
        </h2>
        
        <div className="space-y-4 text-[#a7a7a7]">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-[#ff69b4]">1. Tư vấn</h3>
            <p>Chúng ta thảo luận về ý tưởng, phong cách và yêu cầu của bạn.</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-[#ff69b4]">2. Phác thảo</h3>
            <p>Bản phác thảo và concept art để bạn phê duyệt.</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-[#ff69b4]">3. Animation</h3>
            <p>Tác phẩm hoàn thiện với animation mượt mà, chuyên nghiệp.</p>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
          <h3 className="text-xl font-bold text-[#7978e6] mb-2">
            Sẵn sàng biến ý tưởng thành hiện thực?
          </h3>
          <p className="text-[#a7a7a7]">
            Liên hệ với tôi để thảo luận dự án và nhận báo giá!
          </p>
        </div>
      </div>
    )
  }

  return content[language] || content.en
}

export default CmsIllustration