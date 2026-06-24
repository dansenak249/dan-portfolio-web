'use client'

import { useState } from 'react'
import { findRefByHandoffType } from '../data/references'
import StageCell from './StageCell'
import FileIcon from './FileIcon'

// The pipeline diagram shown on the Overview page. Stages are split into two
// groups — "Model Production" (illustration + rig) and "Model Usage" (tracker +
// composite + stream) — each drawn in its own white bordered box on a light-gray
// borderless panel. Cells are joined by arrows; hovering an arrow reveals the
// handoff files, and clicking a cell opens that stage's documentation page.
const GROUPS = [
  { name: 'PRODUCTION', stageIds: ['art', 'rig'] },
  { name: 'RUNTIME', stageIds: ['tracking', 'compositing', 'platform'] },
]

export default function PipelineMap({ stages, onSelect }) {
  const groups = GROUPS.map((g) => ({
    name: g.name,
    stages: g.stageIds.map((id) => stages.find((s) => s.id === id)).filter(Boolean),
  })).filter((g) => g.stages.length > 0)

  return (
    <div className="bg-[#f7f7f7] p-4 sm:p-6">
      <div className="flex items-stretch justify-center overflow-x-auto pb-1 lg:overflow-visible">
        {groups.map((group, gi) => {
          const lastStage = group.stages[group.stages.length - 1]
          return (
            <div key={group.name} className="flex items-stretch">
              <GroupBox name={group.name} stages={group.stages} onSelect={onSelect} />
              {gi < groups.length - 1 && (
                // Mirror GroupBox's vertical structure (pt-1 / flex-1 row / mt-1
                // caption / pb-2) so this arrow lines up with the in-box arrows.
                <div className="flex shrink-0 flex-col pb-2 pt-1">
                  <div className="flex flex-1 items-center">
                    <MapArrow handoff={lastStage.handoff} onSelect={onSelect} />
                  </div>
                  <div className="invisible mt-1 text-[11px] tracking-[0.16em]" aria-hidden="true">
                    .
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// One white, bordered group box: its stage cells joined by arrows, with the
// group name centered along the bottom edge.
function GroupBox({ name, stages, onSelect }) {
  return (
    <div className="flex shrink-0 flex-col rounded-2xl border border-[#e2e4f0] bg-white px-2 pb-2 pt-1 sm:px-3">
      <ol className="flex flex-1 items-center justify-center">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex items-center">
            <StageCell stage={stage} onSelect={onSelect} />
            {i < stages.length - 1 && <MapArrow handoff={stage.handoff} onSelect={onSelect} />}
          </li>
        ))}
      </ol>
      <div className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#9a9ab5]">
        {name}
      </div>
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
