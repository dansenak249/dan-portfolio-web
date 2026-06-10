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

// Commission types — dropdown options. Each entry may later carry its own
// milestone schema; for now they share the standard 5-week progression.
export const COMMISSION_TYPES = [
  { value: 'Animated Illustration', label: 'Animated Illustration' },
]

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

// Auto-fill milestone fields from startDate + weekOffset.
// If the deadline is too tight to accommodate the full +5-week progression,
// all milestones are cleared instead.
export function autoFillMilestones(job) {
  if (!job.startDate) return job
  if (job.deadline) {
    const minDeadline = addWeeks(job.startDate, 5)
    if (new Date(job.deadline).getTime() < new Date(minDeadline).getTime()) {
      const cleared = { ...job }
      for (const m of MILESTONES) {
        cleared[m.key] = ''
      }
      return cleared
    }
  }
  const filled = { ...job }
  for (const m of MILESTONES) {
    if (!filled[m.key]) {
      filled[m.key] = addWeeks(job.startDate, m.weekOffset)
    }
  }
  return filled
}

// Validate that every date field is in the correct chronological order.
export function validateJobDates(job) {
  const errors = []
  for (let i = 1; i < DATE_FIELDS_ORDER.length; i++) {
    const prevField = DATE_FIELDS_ORDER[i - 1]
    const currField = DATE_FIELDS_ORDER[i]
    const prev = job[prevField]
    const curr = job[currField]
    if (!prev || !curr) continue
    if (new Date(curr).getTime() < new Date(prev).getTime()) {
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
