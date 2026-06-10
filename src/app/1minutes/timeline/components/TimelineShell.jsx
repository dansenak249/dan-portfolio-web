'use client'

import { useState } from 'react'
import Timeline from './Timeline'

// Top-level client wrapper: owns the background toggle state, paints the
// fixed background image when ON, and centers the whole panel (header +
// timeline + edit card) vertically and horizontally.
export default function TimelineShell() {
  const [bgOn, setBgOn] = useState(false)

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center py-4 px-4 sm:px-6 relative ${
        bgOn ? '' : 'bg-[#dadef0]'
      }`}
    >
      {bgOn && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: -1,
            backgroundImage: 'url(/timeline/caydua.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      <div className="max-w-[1600px] w-full">
        {/* Mid-point spacing between the original tight (mb-3) and the
            roomy (mb-8) versions, picked to feel breathable without
            pushing the header too far from the table. */}
        <header className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff69b4] font-bold mb-1">
            1 Minutes
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-bold leading-tight tracking-wide ${
              bgOn ? 'text-white' : 'text-[#2d2d3a]'
            }`}
          >
            COMMISSIONS TIMELINE
          </h1>
          <p
            className={`text-xs mt-1 max-w-xl italic ${
              bgOn ? 'text-white' : 'text-[#6b6b8a]'
            }`}
          >
            Timeline nhà trồng của studio 1 phút với khả năng bảo mật bằng 0.
          </p>
        </header>

        <Timeline bgOn={bgOn} onSetBg={setBgOn} />
      </div>
    </div>
  )
}
