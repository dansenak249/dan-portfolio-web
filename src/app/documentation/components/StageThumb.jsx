'use client'

import { useState } from 'react'

// Shows a software logo image; falls back to a colored monogram when the
// image file is missing or fails to load. Pass `noFallback` to render nothing
// instead of the monogram (used in page headings, which collapse flush-left
// when there is no real logo).
export default function StageThumb({ rep, size = 56, className = '', noFallback = false }) {
  const [err, setErr] = useState(false)
  const box = { width: size, height: size }

  if (rep?.image && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={rep.image}
        alt={rep.name}
        onError={() => setErr(true)}
        style={box}
        className={`rounded-xl object-contain ${className}`}
      />
    )
  }

  if (noFallback) return null

  return (
    <div
      style={{ ...box, backgroundColor: rep?.color || '#6b6b8a' }}
      className={`flex items-center justify-center rounded-xl font-bold text-white ${className}`}
      aria-label={rep?.name}
    >
      <span style={{ fontSize: size * 0.32 }}>{rep?.short || '?'}</span>
    </div>
  )
}
