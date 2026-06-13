// Job timeline utilities: milestones, auto-fill, validation, and date/axis math.

export const MILESTONES = [
  { key: 'layoutSketch', label: 'Layout Sketch', weekOffset: 1 },
  { key: 'colorSketch', label: 'Color Sketch', weekOffset: 2 },
  { key: 'render1', label: 'Render 1', weekOffset: 3 },
  { key: 'render2', label: 'Render 2', weekOffset: 4 },
  { key: 'animation', label: 'Animation', weekOffset: 5 },
]

// Field order used by validation (each must be <= the next).
export const DATE_FIELDS_ORDER = [
  'startDate',
  'layoutSketch',
  'colorSketch',
  'render1',
  'render2',
  'animation',
  'deadline',
]

export const FIELD_LABELS = {
  startDate: 'Start Date',
  layoutSketch: 'Layout Sketch',
  colorSketch: 'Color Sketch',
  render1: 'Render 1',
  render2: 'Render 2',
  animation: 'Animation',
  deadline: 'Deadline',
}

// Default auto-filled deadline offset (weeks after Start) when a type does
// not specify its own.
export const DEFAULT_DEADLINE_WEEK_OFFSET = 8

// Commission types — dropdown options. Each entry declares:
//   - milestoneKeys:        which Progress milestones it uses (subset of MILESTONES)
//   - deadlineWeekOffset:   default auto-filled deadline (weeks after Start)
//   - barGradient:          the subtle fill-bar gradient used in "Type" color mode
//   - accent:               the type's representative solid color
export const COMMISSION_TYPES = [
  {
    value: 'Animated Illustration',
    label: 'Animated Illustration',
    milestoneKeys: ['layoutSketch', 'colorSketch', 'render1', 'render2', 'animation'],
    deadlineWeekOffset: 8,
    barGradient: 'linear-gradient(90deg, #fcd4c6 0%, #ff6e7f 100%)',
    accent: '#ff69b4',
  },
  {
    value: 'Illustration',
    label: 'Illustration',
    // Same as Animated Illustration, minus the Animation milestone.
    // Keyed to the Add button's blue (#5b8de8).
    milestoneKeys: ['layoutSketch', 'colorSketch', 'render1', 'render2'],
    deadlineWeekOffset: 8,
    barGradient: 'linear-gradient(90deg, #aecaf5 0%, #f5c2e2 100%)',
    accent: '#7d6fe0',
  },
  {
    value: 'Animation Only',
    label: 'Animation Only',
    // No Progress milestones at all — just Start → Deadline (+4 weeks).
    milestoneKeys: [],
    deadlineWeekOffset: 4,
    barGradient: 'linear-gradient(90deg, #c4f5d0 0%, #5cf0ee 100%)',
    accent: '#18a6c8',
  },
]

// Look up a type's full config, defaulting to the first type when unknown.
export function getTypeConfig(typeValue) {
  return (
    COMMISSION_TYPES.find((t) => t.value === typeValue) ?? COMMISSION_TYPES[0]
  )
}

// The ordered milestone definitions a given type actually uses.
export function getMilestonesForType(typeValue) {
  const keys = new Set(getTypeConfig(typeValue).milestoneKeys)
  return MILESTONES.filter((m) => keys.has(m.key))
}

// The subtle fill-bar gradient for a type (used in "Type" color mode).
export function getTypeBarGradient(typeValue) {
  return getTypeConfig(typeValue).barGradient
}

// The representative solid accent color for a type.
export function getTypeAccent(typeValue) {
  return getTypeConfig(typeValue).accent
}

// Default auto-filled deadline offset (weeks after Start) for a type.
export function getTypeDeadlineOffset(typeValue) {
  return getTypeConfig(typeValue).deadlineWeekOffset ?? DEFAULT_DEADLINE_WEEK_OFFSET
}

// Fill-bar color modes for the toolbar Color picker. "Type" is the default,
// so it leads the list; "None" sits last.
//   type → a lighter gradient keyed to each task's type
//   none → the default tri-color gradient
export const COLOR_MODES = [
  { value: 'type', label: 'Type' },
  { value: 'none', label: 'None' },
]

// Team members available for assignment, in fixed display order. A commission
// may be assigned to one or more of these. A commission with no assignees is
// treated as a shared/common task that is visible to everyone.
export const USERS = [
  { id: 'duy-anh-nguyen', name: 'Duy Anh Nguyen' },
  { id: 'le-van-nguyen-dan', name: 'Le Van Nguyen Dan' },
  { id: 'phan-thien-loc', name: 'Phan Thien Loc' },
]

// Map a user id to its display name (falls back to the id when unknown).
export function getUserName(id) {
  const user = USERS.find((u) => u.id === id)
  return user ? user.name : id
}

// Filter jobs by a set of selected assignee ids.
// Visibility rules:
//   - empty selection      → filter inactive, every job is visible
//   - job has no assignees  → "common" task, always visible
//   - otherwise             → visible when it shares at least one selected id
export function filterJobsByAssignees(jobs, selectedIds) {
  if (!selectedIds || selectedIds.length === 0) return jobs
  const selected = new Set(selectedIds)
  return jobs.filter((job) => {
    const assignees = job.assignees
    if (!Array.isArray(assignees) || assignees.length === 0) return true
    return assignees.some((id) => selected.has(id))
  })
}

// Cell widths per axis unit.
export const WEEK_WIDTH_MONTH_VIEW = 100 // px per week, in Month view
export const DAY_WIDTH_WEEK_VIEW = 40 // px per day, in Week view

export const VIEW_MODES = ['month', 'week']

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

// Add N weeks to an ISO date string (YYYY-MM-DD), returning ISO date string.
export function addWeeks(isoDate, weeks) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

// Return the ISO date of the next Monday strictly after `fromDate`.
// If `fromDate` is itself a Monday, the function still skips ahead a week.
export function getNextMonday(fromDate = new Date()) {
  const d = new Date(fromDate)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysUntilMonday = ((1 - day + 7) % 7) || 7
  d.setDate(d.getDate() + daysUntilMonday)
  return d.toISOString().slice(0, 10)
}

// Auto-fill milestone fields from startDate + weekOffset, scoped to the
// milestones the job's type actually uses. Milestones not used by the type
// are always cleared. If the deadline is too tight to accommodate the type's
// full progression, that type's milestones are cleared too.
export function autoFillMilestones(job) {
  const typeMilestones = getMilestonesForType(job.type)
  const activeKeys = new Set(typeMilestones.map((m) => m.key))
  const result = { ...job }
  // Clear any milestone the current type does not use.
  for (const m of MILESTONES) {
    if (!activeKeys.has(m.key)) result[m.key] = ''
  }
  if (!job.startDate) return result
  const maxOffset = typeMilestones.reduce(
    (acc, m) => Math.max(acc, m.weekOffset),
    0
  )
  if (job.deadline && maxOffset > 0) {
    const minDeadline = addWeeks(job.startDate, maxOffset)
    if (new Date(job.deadline).getTime() < new Date(minDeadline).getTime()) {
      for (const m of typeMilestones) result[m.key] = ''
      return result
    }
  }
  for (const m of typeMilestones) {
    if (!result[m.key]) {
      result[m.key] = addWeeks(job.startDate, m.weekOffset)
    }
  }
  return result
}

// Validate that every PRESENT date field is in chronological order. Empty
// fields (e.g. milestones a type skips) are ignored, and ordering is checked
// across consecutive present fields so gaps don't hide an invalid sequence.
export function validateJobDates(job) {
  const errors = []
  const present = DATE_FIELDS_ORDER.filter((f) => job[f])
  for (let i = 1; i < present.length; i++) {
    const prevField = present[i - 1]
    const currField = present[i]
    if (
      new Date(job[currField]).getTime() < new Date(job[prevField]).getTime()
    ) {
      errors.push(
        `${FIELD_LABELS[currField]} must be on or after ${FIELD_LABELS[prevField]}`
      )
    }
  }
  return { valid: errors.length === 0, errors }
}

// Compute the timeline axis (range, ticks, month segments, total pixel width)
// for a given list of jobs and view mode ('month' | 'week').
//
// 'month' mode: each tick = a week (Monday); cell width = 100px.
// 'week'  mode: each tick = a day; cell width = 40px.
export function getTimelineAxis(jobs, mode = 'month') {
  let min = Infinity
  let max = -Infinity

  for (const job of jobs) {
    for (const field of DATE_FIELDS_ORDER) {
      if (!job[field]) continue
      const t = new Date(job[field]).getTime()
      if (t < min) min = t
      if (t > max) max = t
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    const now = Date.now()
    min = now
    max = now + MS_PER_WEEK * 6
  }

  // Pad a few days each side for breathing room before snapping.
  min -= 3 * MS_PER_DAY
  max += 3 * MS_PER_DAY

  // Snap min/max to clean unit boundaries.
  const startDate = new Date(min)
  startDate.setHours(0, 0, 0, 0)

  let unitMs
  let cellWidth
  if (mode === 'week') {
    unitMs = MS_PER_DAY
    cellWidth = DAY_WIDTH_WEEK_VIEW
    // Daily mode: just snap to start of day, already done above.
  } else {
    unitMs = MS_PER_WEEK
    cellWidth = WEEK_WIDTH_MONTH_VIEW
    // Snap to the Monday on or before min.
    const dayOfWeek = startDate.getDay() // 0 = Sun, 1 = Mon
    const shift = (dayOfWeek + 6) % 7
    startDate.setDate(startDate.getDate() - shift)
  }

  const snappedMin = startDate.getTime()
  const totalUnits = Math.max(1, Math.ceil((max - snappedMin) / unitMs))
  const snappedMax = snappedMin + totalUnits * unitMs
  const timelineWidth = totalUnits * cellWidth

  // Generate ticks (one per unit).
  const ticks = []
  for (let i = 0; i <= totalUnits; i++) {
    const t = snappedMin + i * unitMs
    const date = new Date(t)
    const percent = ((t - snappedMin) / (snappedMax - snappedMin)) * 100
    ticks.push({
      iso: date.toISOString().slice(0, 10),
      label: String(date.getDate()),
      percent,
      isMonthStart: date.getDate() === 1,
    })
  }

  const monthSegments = computeMonthSegments(snappedMin, snappedMax)

  return {
    minMs: snappedMin,
    maxMs: snappedMax,
    ticks,
    monthSegments,
    timelineWidth,
    cellWidth,
    unitMs,
  }
}

// Build month-aligned segments for the month header strip. Each segment
// describes one month clipped to the [minMs, maxMs] range.
function computeMonthSegments(minMs, maxMs) {
  const segments = []
  const cursor = new Date(minMs)
  cursor.setDate(1)
  cursor.setHours(0, 0, 0, 0)
  // Cursor may now be before minMs (e.g., we snapped to day 1 of month).

  while (cursor.getTime() < maxMs) {
    const monthStartMs = cursor.getTime()
    const nextMonth = new Date(cursor)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const monthEndMs = nextMonth.getTime()

    const visibleStart = Math.max(monthStartMs, minMs)
    const visibleEnd = Math.min(monthEndMs, maxMs)
    if (visibleEnd > visibleStart) {
      const startPct = ((visibleStart - minMs) / (maxMs - minMs)) * 100
      const widthPct = ((visibleEnd - visibleStart) / (maxMs - minMs)) * 100
      segments.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        label: cursor.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        startPct,
        widthPct,
      })
    }
    cursor.setTime(nextMonth.getTime())
  }

  return segments
}

// Convert a date to a percentage along the [minMs, maxMs] axis.
export function dateToPercent(isoDate, minMs, maxMs) {
  if (!isoDate || maxMs === minMs) return 0
  const t = new Date(isoDate).getTime()
  return ((t - minMs) / (maxMs - minMs)) * 100
}

// Short formatter for tooltips/labels (e.g. "Jun 8").
export function formatShort(isoDate) {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
