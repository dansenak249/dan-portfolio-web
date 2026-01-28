import homeIcon from '../sections/Landing/assets/home-icon.png'

const Navigation = ({ activeSection, onSectionChange }) => {
  return (
    <nav className="h-[60px] bg-white border-b-2 border-[#efefef]">
      <div className="px-2 h-full flex items-center">
        {/* Home Button - CHỈ CÓ NÚT NÀY */}
        <button
          onClick={() => onSectionChange('landing')}
          className="flex items-center gap-4 px-6 py-0 h-full hover:scale-105 transition-transform duration-300 rounded-xl bg-white"
        >
          <img 
            src={homeIcon} 
            alt="Home"
            className="h-[45px] aspect-square object-contain"
          />
          <span className="text-3xl font-bold text-[#b7e7fb]">
            Home
          </span>
        </button>
      </div>
    </nav>
  )
}

export default Navigation