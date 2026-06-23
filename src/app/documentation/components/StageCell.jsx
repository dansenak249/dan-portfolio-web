'use client'

import StageThumb from './StageThumb'

// A single square pipeline cell (logo + label + subtext). Shared by the full
// Overview diagram and the small "In the pipeline" diagrams on reference pages.
// Border is transparent until hover, where it adopts the stage accent.
export default function StageCell({ stage, onSelect, compact = false }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(stage.id)}
      style={{ '--accent': stage.accent }}
      className={`flex shrink-0 flex-col items-center rounded-xl border border-transparent bg-white text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_8px_22px_rgba(45,45,58,0.12)] ${
        compact ? 'w-[108px] px-2 py-2.5' : 'w-[120px] px-2 py-3 sm:w-[140px]'
      }`}
    >
      <StageThumb rep={stage.rep} size={compact ? 44 : 52} />
      <span className="mt-2 text-sm font-bold leading-tight text-[#2d2d3a]">{stage.navLabel}</span>
      <span className="mt-0.5 text-[11px] italic leading-tight text-[#6b6b8a]">{stage.sub}</span>
    </button>
  )
}
