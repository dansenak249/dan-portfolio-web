const ProfileDescription = ({ language }) => {
  const content = {
    en: (
      <>
        <p>
          Hi! I'm Dan, a <strong>Technical Artist</strong> specializing in 
          Digital Arts, Visual FX & Animation, and Game Development.
        </p>
        <p className="mt-2">
          I create stunning animated illustrations and bring characters to life 
          with professional 2D animation techniques.
        </p>
      </>
    ),
    vi: (
      <>
        <p>
          Xin chào! Tôi là Dan, một <strong>Technical Artist</strong> chuyên về 
          Digital Arts, Visual FX & Animation và Game Development.
        </p>
        <p className="mt-2">
          Tôi tạo ra những minh họa động tuyệt đẹp và thổi hồn vào nhân vật 
          với kỹ thuật animation 2D chuyên nghiệp.
        </p>
      </>
    )
  }

  return <div>{content[language]}</div>
}

export default ProfileDescription