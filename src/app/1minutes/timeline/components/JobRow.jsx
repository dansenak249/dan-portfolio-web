import { MILESTONES, dateToPercent, formatShort } from '../lib/jobUtils'

// Row height shared by left info card and right lane.
export const ROW_HEIGHT_PX = 116

// Left-side card: commission metadata (fixed column). Clickable to open
// the edit panel for this commission.
export function JobInfoCard({ job, isActive, onClick }) {
  return (
    <div
      data-edit-zone="commission-cell"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`px-4 py-4 border-b border-[#e9ecf5] flex flex-col justify-center cursor-pointer transition-colors ${
        isActive ? 'bg-[#fafbff]' : ''
      }`}
      style={{ height: `${ROW_HEIGHT_PX}px` }}
    >
      <div className="text-[10px] uppercase tracking-wider text-[#ff69b4] font-bold mb-1">
        {job.type}
      </div>
      <div className="text-sm font-bold text-[#2d2d3a] leading-tight truncate">
        {job.commissionName}
      </div>
      <div className="text-xs text-[#6b6b8a] mt-0.5 truncate">
        @{job.clientName}
      </div>
      <div className="text-[10px] text-[#a7a7b8] mt-1.5">
        {formatShort(job.startDate)} <span className="mx-1">→</span>{' '}
        {formatShort(job.deadline)}
      </div>
    </div>
  )
}

// Right-side lane: the bar + caps + milestone dots positioned inside the
// scrollable timeline column.
export function JobLane({ job, minMs, maxMs, isDragging, isActive }) {
  const startPct = dateToPercent(job.startDate, minMs, maxMs)
  const endPct = dateToPercent(job.deadline, minMs, maxMs)
  const widthPct = Math.max(endPct - startPct, 0.3)

  return (
    <div
      className={`relative border-b border-[#e9ecf5] transition-colors ${
        isActive ? 'bg-[#fafbff]' : ''
      }`}
      style={{ height: `${ROW_HEIGHT_PX}px` }}
    >
      {/* Bar — rectangular, very slight rounding */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-9"
        style={{
          left: `${startPct}%`,
          width: `${widthPct}%`,
          borderRadius: '3px',
          background:
            'linear-gradient(90deg, #b1d5ff 0%, #C8E6F5 50%, #ffc4e4 100%)',
          boxShadow:
            '0 4px 12px rgba(177, 213, 255, 0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      />

      {/* Start cap */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#7aa7e8] pointer-events-none"
        style={{ left: `calc(${startPct}% - 1px)` }}
      />

      {/* Deadline diamond cap */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-[#ff69b4] pointer-events-none"
        style={{ left: `calc(${endPct}% - 6px)` }}
      />

      {/* Milestone dots — tooltips suppressed while dragging */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
      >
        {MILESTONES.map((m) => {
          const value = job[m.key]
          if (!value) return null
          const pct = dateToPercent(value, minMs, maxMs)
          return (
            <div
              key={m.key}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${pct}%` }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#5b5bd6] -translate-x-1/2 cursor-pointer transition-transform group-hover:scale-125"
                style={{ boxShadow: '0 2px 6px rgba(91, 91, 214, 0.35)' }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#2d2d3a] text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                <div className="font-bold">{m.label}</div>
                <div className="text-[#c8c8e0]">{formatShort(value)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
