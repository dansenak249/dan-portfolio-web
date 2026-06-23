'use client'

import { useState, useId } from 'react'
import { findTechDef } from '../data/references'

// An inline glossary term embedded in prose. Hover/focus reveals a short
// summary tooltip; clicking navigates to the full Technical Definition page.
export default function InlineTerm({ id, label, onSelect }) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const def = findTechDef(id)

  if (!def) return <span>{label || id}</span>

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tipId : undefined}
        onClick={() => onSelect?.(def.id)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="border-b border-dotted border-[#7978e6] font-semibold text-[#5b4bd6] underline-offset-2 transition-colors hover:border-[#ff69b4] hover:text-[#ff69b4]"
      >
        {label || def.term}
      </button>

      {open && (
        // The outer wrapper is a transparent bridge (pb-2) reaching down to the
        // term, so the cursor can travel onto the card without crossing an
        // un-hovered gap. Because it is a DOM descendant of the hover-tracked
        // span, moving onto it never fires the wrapper's mouseleave — the card
        // holds open so the user can select its text or click the link below.
        <span className="absolute bottom-full left-1/2 z-50 -translate-x-1/2 pb-2">
          <span
            id={tipId}
            role="tooltip"
            className="relative block w-64 select-text rounded-lg border border-[#e2e4f0] bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-[#4a4a63] shadow-[0_8px_24px_rgba(45,45,58,0.16)]"
          >
            <span className="block font-bold text-[#2d2d3a]">{def.term}</span>
            <span className="mt-0.5 block">{def.summary}</span>
            <button
              type="button"
              onClick={() => onSelect?.(def.id)}
              className="mt-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#9a9ab5] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:text-[#5b4bd6] hover:decoration-[#5b4bd6]"
            >
              Click to open reference →
            </button>
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-white" />
          </span>
        </span>
      )}
    </span>
  )
}
