// ============================================================
// src/app/commission/content/Collaboration.jsx

const Collaboration = ({ language }) => {
  const content = {
    en: (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-[#7978e6]">Let's Collaborate!</h2>
        <p className="text-[#a7a7a7] text-lg">
          I'm always open to exciting new projects and collaborations.
        </p>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-[#ff69b4] mb-2">How to work with me:</h3>
          <ol className="list-decimal list-inside space-y-2 text-[#a7a7a7]">
            <li>Reach out via email or social media</li>
            <li>Share your project details and vision</li>
            <li>Get a custom quote and timeline</li>
            <li>Let's create something amazing together!</li>
          </ol>
        </div>
      </div>
    ),
    vi: (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-[#7978e6]">Hợp tác cùng tôi!</h2>
        <p className="text-[#a7a7a7] text-lg">
          Tôi luôn sẵn sàng cho những dự án và cơ hội hợp tác thú vị.
        </p>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-[#ff69b4] mb-2">Cách làm việc với tôi:</h3>
          <ol className="list-decimal list-inside space-y-2 text-[#a7a7a7]">
            <li>Liên hệ qua email hoặc mạng xã hội</li>
            <li>Chia sẻ chi tiết và tầm nhìn dự án</li>
            <li>Nhận báo giá và timeline chi tiết</li>
            <li>Cùng tạo ra điều tuyệt vời!</li>
          </ol>
        </div>
      </div>
    )
  }

  return content[language] || content.en
}

export default Collaboration