const ProfileDescription = ({ language }) => {
  const content = {
    en: (
      <>
        <p className="mt-0">
          Helicopter | 25 | UTC+7
        </p>
        <p className="mt-0">
          <span className="text-[#7b79e5]">Technical Artist</span> specialized in 
          Digital Painting, Animation & Visual FX.
        </p>
        <p className="mt-0">
          I'd be super happy to bring your ideas to life.
        </p>
      </>
    ),
    vi: (
      <>
        <p className="mt-0">
          Helicopter | 25 | UTC+7
        </p>
        <p className="mt-0">
          <span className="text-[#7b79e5]">Technical Artist</span> specialized in 
          Digital Painting, Animation & Visual FX.
        </p>
        <p className="mt-0">
          Tớ sẽ rất vui khi được biến những ý tưởng của cậu thành hiện thực.
        </p>
      </>
    )
  }

  return <div>{content[language]}</div>
}

export default ProfileDescription