// src/app/commission/content/ServiceHeader.jsx

const ServiceHeader = ({ language }) => {
  const content = {
    en: (
      <div>
        <h2 className="text-3xl font-bold text-[#7978e6] mb-3">My Services</h2>
        <p className="text-[#a7a7a7] text-lg">
          Professional illustration and game development services tailored to your needs.
        </p>
      </div>
    ),
    vi: (
      <div>
        <h2 className="text-3xl font-bold text-[#7978e6] mb-3">Dịch vụ của tôi</h2>
        <p className="text-[#a7a7a7] text-lg">
          Dịch vụ minh họa và phát triển game chuyên nghiệp phù hợp với nhu cầu của bạn.
        </p>
      </div>
    )
  }

  return content[language] || content.en
}

export default ServiceHeader