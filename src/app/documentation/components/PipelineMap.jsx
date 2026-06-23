'use client'

import { useState } from 'react'
import { findRefByHandoffType } from '../data/references'
import StageCell from './StageCell'
import FileIcon from './FileIcon'

// The pipeline diagram shown on the Overview page: cells (logo + role + sub)
// joined by arrows. Hovering an arrow reveals the handoff files; each file row
// links to its reference page (opens in a new tab). Clicking a cell opens that
// stage's documentation page.
export default function PipelineMap({ stages, onSelect }) {
  return (
    <div className="py-2">
      <ol className="flex items-stretch overflow-x-auto pb-1 lg:justify-center lg:overflow-visible">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex items-stretch">
            <div className="flex items-center">
              <StageCell stage={stage} onSelect={onSelect} />
            </div>
            {i < stages.length - 1 && <MapArrow handoff={stage.handoff} onSelect={onSelect} />}
          </li>
        ))}
      </ol>
    </div>
  )
}

function MapArrow({ handoff, onSelect }) {
  const [open, setOpen] = useState(false)
  const files = handoff?.files || []

  return (
    // The popover is a DOM descendant of this wrapper, so moving the cursor onto
    // it does not fire mouseleave and it stays open.
    <div
      className="relative flex shrink-0 items-center px-3 py-6 sm:px-6"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className={`text-lg transition-colors ${open ? 'text-[#7978e6]' : 'text-[#a9aed0]'}`}>
        →
      </span>

      {files.length > 0 && open && (
        // `bottom-1/2` anchors the popover just above the arrow (its center),
        // so it sits much closer than `bottom-full` while still never overlapping
        // the next cell. The pb-3 padding is a transparent bridge down to the
        // arrow so crossing the gap never drops hover.
        <div className="absolute bottom-1/2 left-1/2 z-30 -translate-x-1/2 pb-3">
          <div className="rounded-lg border border-[#e2e4f0] bg-white px-2.5 py-2 shadow-[0_8px_24px_rgba(45,45,58,0.16)]">
            <div className="mb-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-[#9a9ab5]">
              Handoff
            </div>
            <ul className="flex flex-col gap-0.5">
              {files.map((f) => (
                <HandoffRow key={f.label} file={f} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// One file row in the popover. If the file maps to a reference page, it becomes
// a button that navigates to that page in-place; otherwise plain text.
function HandoffRow({ file, onSelect }) {
  const ref = findRefByHandoffType(file.type)
  const inner = (
    <>
      <FileIcon type={file.type} />
      <span>{file.label}</span>
    </>
  )

  if (!ref) {
    return (
      <li className="flex items-center gap-1.5 whitespace-nowrap px-1 py-0.5 text-[11px] font-medium text-[#4a4a63]">
        {inner}
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(ref.id)}
        className="flex w-full items-center gap-1.5 whitespace-nowrap rounded px-1 py-0.5 text-left text-[11px] font-medium text-[#4a4a63] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:bg-[#f3f3f9] hover:text-[#5b4bd6] hover:decoration-[#5b4bd6]"
      >
        {inner}
      </button>
    </li>
  )
}
