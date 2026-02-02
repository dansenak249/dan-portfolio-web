const ServiceHeader = ({ language }) => {
  const content = {
    en: 
      <p>
        Explore my creative services below! Each card represents a unique area where I can help bring your vision to life.
      </p>,
    vi:
      <p>
        Khám phá các dịch vụ sáng tạo của tớ bên dưới! Mỗi card đại diện cho một lĩnh vực độc đáo mà tớ có thể giúp biến tầm nhìn của cậu thành hiện thực.
      </p>  
  };
  return <div className="font-aptima text-[#a7a7a7]">{content[language] || content.en}</div>;
};
export default ServiceHeader;