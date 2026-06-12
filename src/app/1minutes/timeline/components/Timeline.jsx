'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { JobInfoCard, JobLane, ROW_HEIGHT_PX } from './JobRow'
import EditPanel from './EditPanel'
import LoadingScreen from '@/components/LoadingScreen'
import {
  COMMISSION_TYPES,
  MILESTONES,
  VIEW_MODES,
  addWeeks,
  autoFillMilestones,
  dateToPercent,
  getNextMonday,
  getTimelineAxis,
} from '../lib/jobUtils'

const DRAG_HANDLE_WIDTH = 28
const COMMISSION_COL_WIDTH = 260
const LEFT_TOTAL_WIDTH = DRAG_HANDLE_WIDTH + COMMISSION_COL_WIDTH
const MONTH_HEADER_HEIGHT = 28
const TICK_HEADER_HEIGHT = 40
const TOTAL_HEADER_HEIGHT = MONTH_HEADER_HEIGHT + TICK_HEADER_HEIGHT
const EDIT_PANEL_WIDTH = 420
const EDIT_PANEL_GAP = 16

// Fixed visible rows in the body. < this many commissions → blank rows fill
// in; > this many → vertical scroll inside the body.
const VISIBLE_ROWS = 5
const BODY_TOTAL_HEIGHT = TOTAL_HEADER_HEIGHT + VISIBLE_ROWS * ROW_HEIGHT_PX
const BODY_SCROLL_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT_PX

// "Today" lands at 20% from the left edge of the lane viewport on first
// load, instead of dead-center (50%), so upcoming work is more visible.
const TODAY_OFFSET_RATIO = 0.2

// Tolerance (as a fraction of lane viewport width) used to decide whether
// the current scroll is already "at today's default position". Anything
// within this band disables the Today button.
const TODAY_DEFAULT_TOLERANCE_RATIO = 0.075

// One "month" of horizontal scroll, in cell units.
const SCROLL_UNITS_PER_MONTH = { month: 4, week: 30 }

// How close to the top/bottom of the body the cursor must be (in px)
// before the body auto-scrolls during a row drag.
const DRAG_AUTOSCROLL_EDGE = 60
const DRAG_AUTOSCROLL_SPEED = 10

// How long the slide-in animation runs when a new commission is added.
const NEW_ROW_ANIM_MS = 320

// Endpoint that backs the file-based JSON persistence layer.
const JOBS_ENDPOINT = '/api/1minutes/timeline/jobs'

// Fields compared to determine whether the form is dirty.
const DIRTY_KEYS = [
  'type',
  'commissionName',
  'clientName',
  'startDate',
  'layoutSketch',
  'colorSketch',
  'render1',
  'render2',
  'animation',
  'deadline',
]

// Blank shape used when creating a brand-new commission, before defaults
// are filled in.
const BLANK_JOB = {
  id: 'new',
  type: COMMISSION_TYPES[0].value,
  commissionName: '',
  clientName: '',
  startDate: '',
  layoutSketch: '',
  colorSketch: '',
  render1: '',
  render2: '',
  animation: '',
  deadline: '',
}

// Hide native scrollbars while preserving scroll behavior.
const HIDE_SCROLLBAR_STYLE = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

// Build the default draft for a brand-new commission:
//   startDate = next Monday after today
//   deadline  = startDate + 8 weeks (also a Monday)
//   milestones = +1..+5 weeks (auto-filled)
function buildNewDraft() {
  const startDate = getNextMonday()
  const deadline = addWeeks(startDate, 8)
  return autoFillMilestones({
    ...BLANK_JOB,
    startDate,
    deadline,
  })
}

// Recompute milestones when startDate or deadline changes inside the form.
function recomputeMilestones(job) {
  if (!job.startDate) return job
  const next = { ...job }
  if (next.deadline) {
    const minDeadlineMs = new Date(addWeeks(next.startDate, 5)).getTime()
    const deadlineMs = new Date(next.deadline).getTime()
    if (deadlineMs < minDeadlineMs) {
      for (const m of MILESTONES) {
        next[m.key] = ''
      }
      return next
    }
  }
  for (const m of MILESTONES) {
    next[m.key] = addWeeks(next.startDate, m.weekOffset)
  }
  return next
}

// Shallow value comparison across the fields users can edit.
function isDraftDifferent(draft, baseline) {
  if (!draft || !baseline) return false
  return DIRTY_KEYS.some((k) => (draft[k] ?? '') !== (baseline[k] ?? ''))
}

export default function Timeline({ bgOn, onSetBg }) {
  // ---- Data state ----
  // jobs === null  → not yet loaded from the server
  // loadFailed     → initial GET failed; render nothing so the user can
  //                  fix the data file before any state mutates
  const [jobs, setJobs] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editingId, setEditingId] = useState(null) // jobId | 'new' | null
  const [drafts, setDrafts] = useState({}) // { [id]: draftJob }
  // Snapshot of the seeded defaults for 'new', used as the baseline for
  // dirty-state comparison when creating.
  const [createBaseline, setCreateBaseline] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // ---- Drag-to-reorder state ----
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // ---- Row hover state ----
  // Drives the full-row highlight when the cursor enters any cell of a row
  // (drag handle, commission name card, or lane). Shared so left + right
  // columns light up together. Suppressed during a row sort drag so the
  // dragged row's gray ghost is not visually mixed with hover bg.
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null)

  // ---- Timeline view state ----
  const scrollRef = useRef(null)
  const headerScrollRef = useRef(null)
  // Inner container that holds the rows. Used to convert pointer Y into
  // a row index during drag-to-sort (works regardless of which row paints
  // on top after translation).
  const rowsRef = useRef(null)
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 })
  const pendingFocalPctRef = useRef(null)
  // Guards the one-shot "scroll to Today on first paint" effect so it
  // only fires after real jobs have loaded and the scroll container has
  // mounted, not during the initial null-data render.
  const didInitialScrollRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [todayIso, setTodayIso] = useState(null)
  const [viewMode, setViewMode] = useState('month')
  const [bodyScrollTop, setBodyScrollTop] = useState(0)
  const [bodyScrollLeft, setBodyScrollLeft] = useState(0)
  const [laneViewport, setLaneViewport] = useState(0)
  // Tracks the most recently inserted commission so it can play a one-shot
  // slide-in animation, then resets to null so re-renders behave normally.
  const [newlyAddedId, setNewlyAddedId] = useState(null)

  // Use an empty list while data is loading so derived axis calculations
  // (which expect an array) don't throw. The actual render is gated on
  // loadFailed / jobs === null further down.
  const jobsForAxis = jobs ?? []
  const axis = useMemo(
    () => getTimelineAxis(jobsForAxis, viewMode),
    [jobsForAxis, viewMode]
  )
  const { minMs, maxMs, ticks, monthSegments, timelineWidth, cellWidth } = axis

  // ---- Effects ----
  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10))
  }, [])

  // Initial load. On any failure we alert the user immediately and stay
  // in the loadFailed state so the surface renders nothing — better to
  // show a blank page than risk overwriting good data with empty state.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(JOBS_ENDPOINT, { cache: 'no-store' })
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${detail || res.statusText}`)
        }
        const payload = await res.json()
        if (!payload || !Array.isArray(payload.jobs)) {
          throw new Error('Malformed payload: missing jobs array')
        }
        if (cancelled) return
        setJobs(payload.jobs)
      } catch (error) {
        if (cancelled) return
        setLoadFailed(true)
        const message =
          error instanceof Error ? error.message : 'Unknown load error'
        window.alert(
          `Failed to load timeline data.\n\n${message}\n\nNothing will be rendered until this is fixed.`
        )
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist the given jobs array to the server. Fire-and-forget from the
  // caller's perspective — we keep the optimistic UI but alert on failure
  // so the user knows their last change wasn't saved.
  const saveJobs = useCallback(async (nextJobs) => {
    try {
      const res = await fetch(JOBS_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: nextJobs }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${detail || res.statusText}`)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown save error'
      window.alert(
        `Failed to save timeline data.\n\n${message}\n\nYour latest change was not persisted.`
      )
    }
  }, [])

  // Measure the lane viewport (body width minus the sticky left column).
  // Re-measure on resize so the Today-default detection stays accurate.
  // Also re-measures when `jobs` flips from null to an array, since the
  // scrollable JSX is gated on that and `scrollRef.current` only attaches
  // after the gate opens.
  useEffect(() => {
    const update = () => {
      if (!scrollRef.current) return
      setLaneViewport(
        Math.max(0, scrollRef.current.clientWidth - LEFT_TOTAL_WIDTH)
      )
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [jobs])

  useEffect(() => {
    // One-shot: only run the very first time we have both a Today value
    // and a populated jobs array (so the axis range actually includes
    // today). Subsequent re-renders never override the user's scroll.
    if (didInitialScrollRef.current) return
    if (!todayIso) return
    if (!jobs) return
    if (!scrollRef.current) return
    if (pendingFocalPctRef.current !== null) return
    const pct = dateToPercent(todayIso, minMs, maxMs)
    if (pct < 0 || pct > 100) {
      // Today not in range — mark done so we don't keep retrying. The
      // user can still tap the Today button later when applicable.
      didInitialScrollRef.current = true
      return
    }
    const viewport = Math.max(
      0,
      scrollRef.current.clientWidth - LEFT_TOTAL_WIDTH
    )
    // Place "today" at 20% from the left edge of the lane viewport.
    const target = (pct / 100) * timelineWidth - viewport * TODAY_OFFSET_RATIO
    scrollRef.current.scrollLeft = Math.max(0, target)
    didInitialScrollRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, jobs, minMs, maxMs, timelineWidth])

  useEffect(() => {
    if (pendingFocalPctRef.current === null || !scrollRef.current) return
    const focalPct = pendingFocalPctRef.current
    pendingFocalPctRef.current = null
    const viewport = Math.max(
      0,
      scrollRef.current.clientWidth - LEFT_TOTAL_WIDTH
    )
    const target = focalPct * timelineWidth - viewport / 2
    scrollRef.current.scrollLeft = Math.max(
      0,
      Math.min(target, timelineWidth - viewport)
    )
  }, [viewMode, timelineWidth])

  useEffect(() => {
    if (editingId === null) return
    const handler = (e) => {
      if (!e.target.closest('[data-edit-zone]')) {
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingId])

  // Auto-scroll the body while a row is being dragged. Tracks the latest
  // dragover cursor Y globally so it works even when the cursor leaves
  // the body container (dragging just past the bottom edge).
  useEffect(() => {
    if (draggingIndex === null) return
    let frame = null
    let lastY = 0
    let active = false

    const onDragOver = (e) => {
      lastY = e.clientY
      active = true
    }

    const tick = () => {
      if (active && scrollRef.current) {
        const rect = scrollRef.current.getBoundingClientRect()
        const distFromTop = lastY - rect.top
        const distFromBottom = rect.bottom - lastY
        if (distFromBottom < DRAG_AUTOSCROLL_EDGE) {
          scrollRef.current.scrollTop += DRAG_AUTOSCROLL_SPEED
        } else if (distFromTop < DRAG_AUTOSCROLL_EDGE && distFromTop > -200) {
          scrollRef.current.scrollTop -= DRAG_AUTOSCROLL_SPEED
        }
      }
      frame = requestAnimationFrame(tick)
    }

    document.addEventListener('dragover', onDragOver)
    frame = requestAnimationFrame(tick)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [draggingIndex])

  // Keep the header strip's horizontal scroll synced with the body's,
  // and surface scrollTop/scrollLeft to React state for derived values.
  const handleBodyScroll = useCallback(() => {
    if (!scrollRef.current) return
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft
    }
    setBodyScrollTop(scrollRef.current.scrollTop)
    setBodyScrollLeft(scrollRef.current.scrollLeft)
  }, [])

  // ---- Toolbar actions ----
  const scrollByMonth = (direction) => {
    if (!scrollRef.current) return
    const units = SCROLL_UNITS_PER_MONTH[viewMode] ?? 4
    scrollRef.current.scrollBy({
      left: direction * units * cellWidth,
      behavior: 'smooth',
    })
  }

  const scrollToToday = () => {
    if (!todayIso || !scrollRef.current) return
    const pct = dateToPercent(todayIso, minMs, maxMs)
    if (pct < 0 || pct > 100) return
    const viewport = Math.max(
      0,
      scrollRef.current.clientWidth - LEFT_TOTAL_WIDTH
    )
    const target = (pct / 100) * timelineWidth - viewport * TODAY_OFFSET_RATIO
    scrollRef.current.scrollTo({
      left: Math.max(0, target),
      behavior: 'smooth',
    })
  }

  const handleViewChange = (newMode) => {
    if (newMode === viewMode) return
    if (scrollRef.current) {
      const viewport = Math.max(
        0,
        scrollRef.current.clientWidth - LEFT_TOTAL_WIDTH
      )
      const centerPx = scrollRef.current.scrollLeft + viewport / 2
      pendingFocalPctRef.current = centerPx / timelineWidth
    }
    setViewMode(newMode)
  }

  // ---- Drag-to-pan timeline ----
  // Pan is suppressed entirely while a row sort drag is in progress so the
  // two interactions don't fight for the same pointer.
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return
    if (draggingIndex !== null) return
    if (e.target.closest('[data-edit-zone]')) return
    dragRef.current = {
      isDown: true,
      startX: e.pageX,
      scrollLeft: scrollRef.current.scrollLeft,
    }
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current.isDown || !scrollRef.current) return
    if (draggingIndex !== null) {
      endDrag()
      return
    }
    e.preventDefault()
    const dx = e.pageX - dragRef.current.startX
    scrollRef.current.scrollLeft = dragRef.current.scrollLeft - dx
  }

  const endDrag = () => {
    if (!dragRef.current.isDown) return
    dragRef.current.isDown = false
    setIsDragging(false)
  }

  // ---- Drag-to-reorder rows ----
  const handleRowDragStart = (e, index) => {
    setDraggingIndex(index)
    setDragOverIndex(index)
    setHoveredRowIndex(null)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox to fire dragover.
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleRowDragEnd = () => {
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  // Container-level dragover. Computes the target index from the cursor's
  // Y position relative to the rows wrapper, so overlapping translated
  // rows never block the source row from being reached.
  const handleBodyDragOver = (e) => {
    if (draggingIndex === null) return
    if (!rowsRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = rowsRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const idx = Math.floor(y / ROW_HEIGHT_PX)
    const clamped = Math.max(0, Math.min(jobs.length - 1, idx))
    if (dragOverIndex !== clamped) setDragOverIndex(clamped)
  }

  const handleBodyDrop = (e) => {
    e.preventDefault()
    if (draggingIndex === null) {
      setDragOverIndex(null)
      return
    }
    const dropIndex = dragOverIndex ?? draggingIndex
    if (draggingIndex !== dropIndex && jobs) {
      const next = [...jobs]
      const [moved] = next.splice(draggingIndex, 1)
      next.splice(dropIndex, 0, moved)
      setJobs(next)
      // Array order IS the persisted position — write the new order
      // immediately so a refresh always reflects the latest layout.
      saveJobs(next)
    }
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  // ---- Edit / Create / Save / Restore / Delete ----
  const baselineFor = useCallback(
    (id) => {
      if (id === 'new') return BLANK_JOB
      return jobs?.find((j) => j.id === id) ?? null
    },
    [jobs]
  )

  const draftFor = (id) => {
    if (drafts[id]) return drafts[id]
    return baselineFor(id)
  }

  const openEditFor = (jobId) => {
    if (editingId === jobId) {
      setEditingId(null)
      return
    }
    setEditingId(jobId)
  }

  const openCreate = () => {
    if (editingId === 'new') {
      setEditingId(null)
      return
    }
    // Seed defaults the first time the user opens Create. Subsequent
    // re-opens keep whatever they were typing.
    if (!drafts['new']) {
      const seeded = buildNewDraft()
      setDrafts((prev) => ({ ...prev, new: seeded }))
      setCreateBaseline(seeded)
    }
    setEditingId('new')
  }

  const handleFieldChange = (id) => (key, value) => {
    setDrafts((prev) => {
      const current = prev[id] ?? baselineFor(id) ?? BLANK_JOB
      let next = { ...current, [key]: value }
      // When the date frame changes, keep the +1..+5 progression in sync.
      if (key === 'startDate' || key === 'deadline') {
        next = recomputeMilestones(next)
      }
      return { ...prev, [id]: next }
    })
  }

  const handleSave = (id) => {
    const draft = draftFor(id)
    if (!draft) return
    if (!jobs) return
    const filled = autoFillMilestones(draft)
    let nextJobs
    if (id === 'new') {
      const newId = `job-${Date.now()}`
      // Prepend so the newest commission appears at the top of the list.
      nextJobs = [{ ...filled, id: newId }, ...jobs]
      setJobs(nextJobs)
      setNewlyAddedId(newId)
      setCreateBaseline(null)
      // Clear the one-shot animation flag after it finishes.
      window.setTimeout(() => {
        setNewlyAddedId((current) => (current === newId ? null : current))
      }, NEW_ROW_ANIM_MS + 40)
    } else {
      nextJobs = jobs.map((j) => (j.id === id ? { ...filled, id } : j))
      setJobs(nextJobs)
    }
    saveJobs(nextJobs)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setEditingId(null)
  }

  const handleRestore = (id) => {
    if (id === 'new') {
      // Re-seed defaults and reset baseline so dirty state goes back to clean.
      const seeded = buildNewDraft()
      setDrafts((prev) => ({ ...prev, new: seeded }))
      setCreateBaseline(seeded)
    } else {
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const handleRequestDelete = (id) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = () => {
    const id = confirmDeleteId
    if (!id) return
    if (!jobs) return
    const nextJobs = jobs.filter((j) => j.id !== id)
    setJobs(nextJobs)
    saveJobs(nextJobs)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setConfirmDeleteId(null)
    if (editingId === id) setEditingId(null)
  }

  const handleCancelDelete = () => setConfirmDeleteId(null)

  const handleClosePanel = () => setEditingId(null)

  // ---- Row hover helpers ----
  // Suppressed entirely while a row sort drag is in progress so the
  // gray ghost is not mixed with a hover highlight under it.
  const handleRowMouseEnter = (index) => {
    if (draggingIndex !== null) return
    setHoveredRowIndex(index)
  }

  const handleRowMouseLeave = () => {
    setHoveredRowIndex(null)
  }

  // ---- Render guard ----
  // loadFailed: initial GET failed (user was alerted) — render nothing
  // so the bad-data state can't be mutated/overwritten with empty state.
  // jobs === null: still fetching — show the loading screen instead of
  // a blank surface so the user gets immediate visual feedback.
  if (loadFailed) {
    return null
  }
  if (jobs === null) {
    return <LoadingScreen />
  }

  // ---- Derived ----
  const todayPct = todayIso ? dateToPercent(todayIso, minMs, maxMs) : null
  const todayVisible = todayPct !== null && todayPct >= 0 && todayPct <= 100

  // Where Today would land at the default 20% offset, in scrollLeft pixels.
  // Compared against bodyScrollLeft (±tolerance) to decide if the Today
  // button should be disabled to avoid the "broken button" misread.
  const todayDefaultScrollLeft = todayVisible
    ? Math.max(0, (todayPct / 100) * timelineWidth - laneViewport * TODAY_OFFSET_RATIO)
    : 0
  const todayTolerance = laneViewport * TODAY_DEFAULT_TOLERANCE_RATIO
  const isTodayAtDefault =
    todayVisible &&
    laneViewport > 0 &&
    Math.abs(bodyScrollLeft - todayDefaultScrollLeft) < todayTolerance

  const activeRowIndex =
    editingId === null || editingId === 'new'
      ? -1
      : jobs.findIndex((j) => j.id === editingId)

  const currentDraft =
    editingId !== null
      ? drafts[editingId] ?? baselineFor(editingId) ?? BLANK_JOB
      : null

  // Baseline for dirty comparison: existing job uses its saved row,
  // 'new' uses the seeded defaults snapshot.
  const compareBaseline =
    editingId === 'new' ? createBaseline : baselineFor(editingId)

  const currentIsDirty =
    editingId !== null && isDraftDifferent(currentDraft, compareBaseline)

  const isPanelOpen = editingId !== null && currentDraft !== null

  // Blank rows fill to keep the body at exactly VISIBLE_ROWS.
  const blankRowCount = Math.max(0, VISIBLE_ROWS - jobs.length)
  const totalRowCount = jobs.length + blankRowCount

  // The active row gradient frame is positioned relative to the body section
  // (which starts at TOTAL_HEADER_HEIGHT inside the body container).
  const activeRowTop =
    activeRowIndex >= 0
      ? TOTAL_HEADER_HEIGHT + activeRowIndex * ROW_HEIGHT_PX - bodyScrollTop
      : 0

  // Allow vertical scrolling only when there are more rows than the visible
  // window. With exactly VISIBLE_ROWS or fewer, force overflow hidden so the
  // user can't nudge the body into a half-pixel scroll.
  const allowYScroll = jobs.length > VISIBLE_ROWS

  // Add button visual state — dim/inactive look when the create panel is
  // already open, so it reads as "you're already in this mode" instead of
  // the previous solid hover style. Click still toggles the panel closed.
  const isCreateOpen = editingId === 'new'

  return (
    <div>
      {/* Above-table strip — "Active Commissions" label + a white badge for
          the count, sitting outside the card on the top-right. */}
      <div className="flex items-center justify-end gap-2 mb-2 px-1">
        <span
          className={`text-[10px] uppercase tracking-[0.18em] font-bold ${
            bgOn ? 'text-white' : 'text-[#6b6b8a]'
          }`}
        >
          Active Commissions
        </span>
        <span
          className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded bg-white text-[#2d2d3a] text-sm font-bold leading-none"
          style={{ boxShadow: '0 2px 8px rgba(75, 0, 130, 0.12)' }}
        >
          {jobs.length}
        </span>
      </div>

      <div className="flex items-stretch">
        {/* ============ Timeline card ============ */}
        <div className="relative flex-1 min-w-0">
          <div
            className="absolute inset-0 bg-[#b1d5ff] rounded-lg"
            style={{ transform: 'translate(3px, 3px)', zIndex: -1 }}
          />
          <div
            className="bg-white rounded-lg overflow-hidden h-full flex flex-col"
            style={{ boxShadow: '0 20px 60px rgba(75, 0, 130, 0.12)' }}
          >
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-[#e9ecf5] flex items-center justify-between bg-white gap-4 flex-wrap flex-none">
              {/* Left: Add */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  data-edit-zone="create-btn"
                  onClick={openCreate}
                  className={`h-8 px-3 rounded text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                    isCreateOpen
                      ? 'bg-[#5b8de8]/40 text-white/70 cursor-default'
                      : 'bg-[#5b8de8] text-white hover:bg-[#4a78d6]'
                  }`}
                >
                  <PlusIcon />
                  Add
                </button>
              </div>

              {/* Right: BG toggle + view + pan controls */}
              <div className="flex items-center gap-3">
                {/* BG toggle (ON / OFF) — ON sits on the left, OFF is the
                    default selection on the right. */}
                <div className="flex items-center bg-[#f4f6fc] rounded p-0.5">
                  {[
                    { value: true, label: 'ON' },
                    { value: false, label: 'OFF' },
                  ].map(({ value, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onSetBg?.(value)}
                      className={`px-3 h-7 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        bgOn === value
                          ? 'bg-white text-[#2d2d3a] shadow-sm'
                          : 'text-[#6b6b8a] hover:text-[#2d2d3a]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="w-px h-6 bg-[#e9ecf5]" />
                <div className="flex items-center bg-[#f4f6fc] rounded p-0.5">
                  {VIEW_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleViewChange(mode)}
                      className={`px-3 h-7 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        viewMode === mode
                          ? 'bg-white text-[#2d2d3a] shadow-sm'
                          : 'text-[#6b6b8a] hover:text-[#2d2d3a]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="w-px h-6 bg-[#e9ecf5]" />
                <div className="flex items-center gap-1.5">
                  <ToolbarButton
                    onClick={() => scrollByMonth(-1)}
                    label="Previous month"
                  >
                    <ChevronLeft />
                  </ToolbarButton>
                  <button
                    type="button"
                    onClick={scrollToToday}
                    disabled={!todayVisible || isTodayAtDefault}
                    className="px-3 h-8 rounded text-xs font-bold uppercase tracking-wider bg-[#ff69b4] text-white hover:bg-[#ff4fa3] disabled:bg-[#e5e5f0] disabled:text-[#a7a7b8] disabled:cursor-not-allowed transition-colors"
                  >
                    Today
                  </button>
                  <ToolbarButton
                    onClick={() => scrollByMonth(1)}
                    label="Next month"
                  >
                    <ChevronRight />
                  </ToolbarButton>
                </div>
              </div>
            </div>

            {/* Body: fixed height, headers on top + horizontal+vertical scroll
                area below. Left column is sticky horizontally so the commission
                list stays visible as the lanes pan. */}
            <div
              className="relative flex-none overflow-hidden"
              style={{ height: `${BODY_TOTAL_HEIGHT}px` }}
            >
              {/* Header strip (non-scrolling vertically). Right side mirrors
                  the body's horizontal scroll via headerScrollRef. */}
              <div
                className="flex"
                style={{ height: `${TOTAL_HEADER_HEIGHT}px` }}
              >
                {/* Left side header */}
                <div
                  className="flex-none border-r border-[#e9ecf5] flex"
                  style={{ width: `${LEFT_TOTAL_WIDTH}px` }}
                >
                  <div
                    style={{ width: `${DRAG_HANDLE_WIDTH}px` }}
                    className="flex flex-col border-r border-[#e9ecf5]"
                  >
                    <div
                      style={{ height: `${MONTH_HEADER_HEIGHT}px` }}
                      className="bg-[#eef2fc] border-b border-[#e9ecf5]"
                    />
                    <div className="flex-1 bg-[#f4f6fc] border-b border-[#e9ecf5]" />
                  </div>
                  <div
                    className="flex flex-col"
                    style={{ width: `${COMMISSION_COL_WIDTH}px` }}
                  >
                    <div
                      style={{ height: `${MONTH_HEADER_HEIGHT}px` }}
                      className="bg-[#eef2fc] border-b border-[#e9ecf5]"
                    />
                    <div className="flex-1 px-4 flex items-center bg-[#f4f6fc] border-b border-[#e9ecf5]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6b6b8a]">
                        Commissions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side header — horizontally synced to body scroll */}
                <div
                  ref={headerScrollRef}
                  className="flex-1 overflow-hidden [&::-webkit-scrollbar]:hidden"
                  style={HIDE_SCROLLBAR_STYLE}
                >
                  <div
                    className="relative"
                    style={{ width: `${timelineWidth}px` }}
                  >
                    {/* Month header */}
                    <div
                      className="relative bg-[#eef2fc] border-b border-[#e9ecf5]"
                      style={{ height: `${MONTH_HEADER_HEIGHT}px` }}
                    >
                      {monthSegments.map((seg) => (
                        <div
                          key={seg.key}
                          className="absolute top-0 bottom-0 flex items-center px-2 border-r border-[#dfe3f0] overflow-hidden"
                          style={{
                            left: `${seg.startPct}%`,
                            width: `${seg.widthPct}%`,
                          }}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2d2d3a] whitespace-nowrap">
                            {seg.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day/Week ticks header */}
                    <div
                      className="relative bg-[#f4f6fc] border-b border-[#e9ecf5]"
                      style={{ height: `${TICK_HEADER_HEIGHT}px` }}
                    >
                      {ticks.map((tick) => (
                        <div
                          key={tick.iso}
                          className="absolute top-0 bottom-0"
                          style={{ left: `${tick.percent}%` }}
                        >
                          <div
                            className={`absolute top-0 bottom-0 w-px ${
                              tick.isMonthStart ? 'bg-[#c8cee0]' : 'bg-[#dfe3f0]'
                            }`}
                          />
                          <span className="absolute top-1/2 -translate-y-1/2 ml-1.5 text-[12px] font-medium text-[#2d2d3a] whitespace-nowrap">
                            {tick.label}
                          </span>
                        </div>
                      ))}
                      {todayVisible && (
                        <div
                          className="absolute top-0 bottom-0 z-10"
                          style={{ left: `${todayPct}%` }}
                        >
                          <span className="absolute top-1 left-1.5 px-1.5 py-0.5 bg-[#ff69b4] text-white text-[9px] font-bold rounded uppercase tracking-wider whitespace-nowrap">
                            Today
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scroll body: single container for x + y scroll. Left column
                  is position: sticky so it stays pinned while lanes pan.
                  Both scrollbars are visually hidden. */}
              <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onScroll={handleBodyScroll}
                className="select-none [&::-webkit-scrollbar]:hidden"
                style={{
                  ...HIDE_SCROLLBAR_STYLE,
                  height: `${BODY_SCROLL_HEIGHT}px`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  overflowX: 'auto',
                  overflowY: allowYScroll ? 'auto' : 'hidden',
                }}
              >
                <div
                  ref={rowsRef}
                  className="flex relative"
                  style={{ width: `${LEFT_TOTAL_WIDTH + timelineWidth}px` }}
                  onDragOver={handleBodyDragOver}
                  onDrop={handleBodyDrop}
                >
                  {/* Drop target indicator — a thin pink bar at the top
                      edge of the slot the source row will land in.
                      Hidden when the drop target equals the source's
                      current slot (no-op move). */}
                  {draggingIndex !== null &&
                    dragOverIndex !== null &&
                    dragOverIndex !== draggingIndex && (
                      <div
                        className="absolute left-0 right-0 pointer-events-none z-40"
                        style={{
                          top: `${dragOverIndex * ROW_HEIGHT_PX}px`,
                          height: '3px',
                          background:
                            'linear-gradient(90deg, #ff69b4 0%, #5b8de8 100%)',
                          boxShadow: '0 0 8px rgba(255, 105, 180, 0.5)',
                        }}
                      />
                    )}
                  {/* Left column — sticky left so it stays pinned on x-pan */}
                  <div
                    className="sticky left-0 z-20 flex-none border-r border-[#e9ecf5] bg-white"
                    style={{ width: `${LEFT_TOTAL_WIDTH}px` }}
                  >
                    {jobs.map((job, index) => {
                      const isBeingDragged = draggingIndex === index
                      const isNewlyAdded = job.id === newlyAddedId
                      const isHovered =
                        draggingIndex === null && hoveredRowIndex === index
                      return (
                        <div
                          key={job.id}
                          onMouseEnter={() => handleRowMouseEnter(index)}
                          onMouseLeave={handleRowMouseLeave}
                          className={`relative ${
                            isNewlyAdded ? 'timeline-row-enter' : ''
                          }`}
                          style={{
                            // Source row stays put at its original slot —
                            // gray bg + faded content tells the user
                            // "this is what's being moved". The drop
                            // target slot is communicated by a separate
                            // indicator line, not by translating rows.
                            backgroundColor: isBeingDragged
                              ? '#eef0f7'
                              : isHovered
                                ? '#fafbff'
                                : undefined,
                          }}
                        >
                          <div
                            className="flex"
                            style={{ opacity: isBeingDragged ? 0.3 : 1 }}
                          >
                            <DragHandleCell
                              index={index}
                              onDragStart={handleRowDragStart}
                              onDragEnd={handleRowDragEnd}
                            />
                            <div
                              style={{ width: `${COMMISSION_COL_WIDTH}px` }}
                            >
                              <JobInfoCard
                                job={job}
                                isActive={editingId === job.id}
                                onClick={() => openEditFor(job.id)}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {/* Blank filler rows — click anywhere to open Create */}
                    {Array.from({ length: blankRowCount }).map((_, i) => (
                      <BlankRow
                        key={`blank-${i}`}
                        isLast={i === blankRowCount - 1}
                        onClick={openCreate}
                      />
                    ))}
                  </div>

                  {/* Right lanes area */}
                  <div
                    className="relative"
                    style={{ width: `${timelineWidth}px` }}
                  >
                    {/* vertical guides */}
                    <div className="absolute inset-0 pointer-events-none">
                      {ticks.map((tick) => (
                        <div
                          key={tick.iso}
                          className={`absolute top-0 bottom-0 w-px ${
                            tick.isMonthStart
                              ? 'bg-[#e3e7f2]'
                              : 'bg-[#f0f2fa]'
                          }`}
                          style={{ left: `${tick.percent}%` }}
                        />
                      ))}
                    </div>

                    {jobs.map((job, index) => {
                      const isBeingDragged = draggingIndex === index
                      const isNewlyAdded = job.id === newlyAddedId
                      const isHovered =
                        draggingIndex === null && hoveredRowIndex === index
                      return (
                        <div
                          key={job.id}
                          onMouseEnter={() => handleRowMouseEnter(index)}
                          onMouseLeave={handleRowMouseLeave}
                          className={`relative ${
                            isNewlyAdded ? 'timeline-row-enter' : ''
                          }`}
                          style={{
                            // Hover bg sits on the wrapper, beneath the
                            // JobLane content. The lane bar (opaque) and
                            // the today line (z-10, in the lanes container
                            // outside the wrapper) both paint above this,
                            // so the highlight never overlays the fill or
                            // the today marker.
                            backgroundColor: isBeingDragged
                              ? '#eef0f7'
                              : isHovered
                                ? '#fafbff'
                                : undefined,
                          }}
                        >
                          <div
                            style={{ opacity: isBeingDragged ? 0.3 : 1 }}
                          >
                            <JobLane
                              job={job}
                              minMs={minMs}
                              maxMs={maxMs}
                              isDragging={isDragging}
                              isActive={editingId === job.id}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {/* Blank lanes — empty spacers to keep row heights matched */}
                    {Array.from({ length: blankRowCount }).map((_, i) => (
                      <div
                        key={`blank-lane-${i}`}
                        style={{ height: `${ROW_HEIGHT_PX}px` }}
                      />
                    ))}

                    {todayVisible && (
                      <div
                        className="absolute top-0 pointer-events-none z-10"
                        style={{
                          left: `${todayPct}%`,
                          width: '2px',
                          height: `${totalRowCount * ROW_HEIGHT_PX}px`,
                          transform: 'translateX(-1px)',
                          background:
                            'repeating-linear-gradient(to bottom, #ff69b4 0 5px, transparent 5px 10px)',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Active row gradient frame — overlays viewport, follows scroll.
                  Gradient runs pink → blue (reversed from the bottom bar). */}
              {activeRowIndex >= 0 && (
                <div
                  className="absolute pointer-events-none z-30"
                  style={{
                    top: `${activeRowTop}px`,
                    left: 0,
                    right: 0,
                    height: `${ROW_HEIGHT_PX}px`,
                    border: '2px solid transparent',
                    borderImage:
                      'linear-gradient(90deg, #ffc4e4 0%, #C8E6F5 50%, #b1d5ff 100%) 1',
                  }}
                />
              )}
            </div>

            {/* Note (legend) */}
            <div className="border-t border-[#e9ecf5] bg-[#fafbff] px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6b6b8a] flex-none">
              <span className="text-[10px] uppercase tracking-wider text-[#6b6b8a] font-bold mr-2">
                Note
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7aa7e8]" />
                Start
              </span>
              {MILESTONES.map((m) => (
                <span key={m.key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-[#5b5bd6]" />
                  {m.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rotate-45 bg-[#ff69b4]" />
                Deadline
              </span>
            </div>

            <div
              className="h-3 flex-none"
              style={{
                background:
                  'linear-gradient(90deg, #b1d5ff 0%, #C8E6F5 50%, #ffc4e4 100%)',
              }}
            />
          </div>
        </div>

        {/* ============ Edit / Create card (slide-in from right) ============
            Wrapper is always rendered so width can animate from 0 → 420.
            Inner content is anchored to the wrapper's right edge so the
            reveal looks like a panel sliding in from the right. */}
        <div
          className="relative flex-none overflow-hidden transition-all duration-300 ease-out"
          style={{
            width: isPanelOpen ? `${EDIT_PANEL_WIDTH}px` : '0px',
            marginLeft: isPanelOpen ? `${EDIT_PANEL_GAP}px` : '0px',
          }}
        >
          <div
            className="absolute top-0 right-0 h-full"
            style={{ width: `${EDIT_PANEL_WIDTH}px` }}
          >
            <div className="relative h-full">
              <div
                className="absolute inset-0 bg-[#b1d5ff] rounded-lg"
                style={{ transform: 'translate(3px, 3px)', zIndex: -1 }}
              />
              <div
                className="bg-white rounded-lg overflow-hidden h-full"
                style={{ boxShadow: '0 20px 60px rgba(75, 0, 130, 0.12)' }}
              >
                {isPanelOpen && (
                  <EditPanel
                    key={editingId}
                    mode={editingId === 'new' ? 'create' : 'edit'}
                    draft={currentDraft}
                    isDirty={currentIsDirty}
                    onFieldChange={handleFieldChange(editingId)}
                    onSave={() => handleSave(editingId)}
                    onRestore={() => handleRestore(editingId)}
                    onDelete={() => handleRequestDelete(editingId)}
                    onClose={handleClosePanel}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {confirmDeleteId !== null && (
          <div
            data-edit-zone="confirm-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2d2d3a]/40 backdrop-blur-sm"
            onClick={handleCancelDelete}
          >
            <div
              className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-base font-bold text-[#2d2d3a] mb-1">
                Delete this commission?
              </div>
              <div className="text-sm text-[#6b6b8a] mb-4">
                This will permanently remove the commission from the timeline.
                Drafts you have not saved elsewhere will also be discarded.
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="h-9 px-4 rounded text-xs font-bold uppercase tracking-wider bg-white border border-[#e0e4ee] text-[#6b6b8a] hover:text-[#2d2d3a] hover:border-[#c8cee0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="h-9 px-4 rounded text-xs font-bold uppercase tracking-wider bg-[#d6336c] text-white hover:bg-[#b8275a] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BlankRow({ isLast, onClick }) {
  return (
    <div
      data-edit-zone="commission-cell"
      onClick={onClick}
      style={{ height: `${ROW_HEIGHT_PX}px` }}
      className={`flex cursor-pointer bg-[#fafbff] hover:bg-[#f1f5ff] transition-colors ${
        isLast ? '' : 'border-b border-[#e9ecf5]'
      }`}
    >
      <div
        style={{ width: `${DRAG_HANDLE_WIDTH}px` }}
        className="border-r border-[#e9ecf5]"
      />
      <div
        style={{ width: `${COMMISSION_COL_WIDTH}px` }}
        className="flex items-center justify-center text-[11px] uppercase tracking-wider font-bold text-[#a7a7b8]"
      >
        + Add commission
      </div>
    </div>
  )
}

function DragHandleCell({ index, onDragStart, onDragEnd }) {
  return (
    <div
      data-edit-zone="drag-handle"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnd={onDragEnd}
      style={{
        width: `${DRAG_HANDLE_WIDTH}px`,
        height: `${ROW_HEIGHT_PX}px`,
      }}
      className="flex items-center justify-center border-b border-r border-[#e9ecf5] text-[#a7a7b8] hover:text-[#5b5bd6] cursor-grab active:cursor-grabbing transition-colors flex-none"
      title="Drag to reorder"
      aria-label="Drag to reorder this commission"
    >
      <DragIcon />
    </div>
  )
}

function ToolbarButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 flex items-center justify-center rounded text-[#6b6b8a] hover:bg-[#f4f6fc] hover:text-[#2d2d3a] transition-colors"
    >
      {children}
    </button>
  )
}

function ChevronLeft() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function DragIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="16" x2="20" y2="16" />
    </svg>
  )
}
