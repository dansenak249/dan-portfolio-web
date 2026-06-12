'use client'

import { useEffect, useState } from 'react'

// Brand "purple-pink" used for Today badge and the bottom gradient.
// Kept consistent so the loading state still feels on-brand.
const LOADING_COLOR = '#ff69b4'

// Default solid page fill — matches both the timeline shell and the
// food picker page so the overlay disappears any header / chrome
// behind a clean fill until data is ready.
const BG_FILL = '#dadef0'

// Three-step dot cycle: ".", "..", "..." — keeps the text from looking
// frozen while the initial fetch / preload is in flight.
const DOT_SEQUENCE = ['.', '..', '...']
const DOT_INTERVAL_MS = 400

export default function LoadingScreen() {
  const [dotIndex, setDotIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setDotIndex((i) => (i + 1) % DOT_SEQUENCE.length)
    }, DOT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    // Fixed full-viewport overlay so the parent's header / chrome
    // stays hidden behind a clean fill until data is ready. z-50 keeps
    // it above any content that may mount underneath.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: BG_FILL }}
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/general/loading.gif"
          alt="Loading"
          style={{ width: '140px', height: 'auto' }}
        />
        <div
          className="text-lg font-bold uppercase tracking-[0.18em] flex items-baseline"
          style={{ color: LOADING_COLOR }}
        >
          <span>Loading</span>
          {/* Fixed-width slot so the text doesn't shift as dots cycle. */}
          <span
            style={{
              display: 'inline-block',
              width: '28px',
              textAlign: 'left',
              marginLeft: '4px',
            }}
          >
            {DOT_SEQUENCE[dotIndex]}
          </span>
        </div>
      </div>
    </div>
  )
}
