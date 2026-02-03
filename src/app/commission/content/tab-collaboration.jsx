const Collaboration = ({ language }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold text-[#cd6ec6]">
      {language === 'vi' ? 'Ready for Collaboration!' : 'Ready for Collaboration!'}
    </h2>
    <p>
      {language === 'vi' 
        ? 'Tớ luôn sẵn sàng với những project thú vị để cùng thực hiện. Nếu cậu có ý tưởng nào, đừng ngần ngại liên hệ nhá (*≧︶≦))(￣▽￣* )ゞ' 
        : 'I am always looking for exciting projects to work on. If you have an idea, feel free to reach out (*≧︶≦))(￣▽￣* )ゞ'}
    </p>
    <div className="p-4 bg-blue-50 text-blue-600 rounded-md inline-block">
      Email: dan.senak249@gmail.com
    </div>
  </div>
);
export default Collaboration;