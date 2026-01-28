import { useState, useEffect } from 'react'
import Landing from './sections/Landing/Landing'

function App() {
  const [activeSection, setActiveSection] = useState('landing')

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      setActiveSection(hash)
    }
  }, [])

  const handleSectionChange = (section) => {
    setActiveSection(section)
    window.history.pushState(null, null, `#${section}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      <main>
        {activeSection === 'landing' && (
          <Landing 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange} 
          />
        )}
        {activeSection === 'commission' && <Commission />}
        {activeSection === 'tos' && <TOS />}
        {activeSection === 'contact' && <Contact />}
      </main>
    </div>
  )
}

export default App