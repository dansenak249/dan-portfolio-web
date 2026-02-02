const ProfileDescription = ({ language }) => {
  const content = {
    en: (
      <>
        <p>
          Helicopter | 25 | UTC+7
        </p>
        <p className="mt-2">
          <span className="text-[#7b79e5]">Technical Artist</span> specializing in 
          Digital Arts, Visual FX & Animation, and Game Development.
        </p>
        <p className="mt-2">
          I'd be super happy to bring your ideas to life.
        </p>
      </>
    ),
    vi: (
      <>
        <p>
          Helicopter | 25 | UTC+7
        </p>
        <p className="mt-2">
          <span className="text-[#7b79e5]">Technical Artist</span> chuyên về 
          Digital Arts, Visual FX & Animation và Game Development.
        </p>
        <p className="mt-2">
          Tớ sẽ rất vui được biến ý tưởng của cậu thành hiện thực nè.
        </p>
      </>
    )
  }

  return <div>{content[language]}</div>
}

export default ProfileDescription