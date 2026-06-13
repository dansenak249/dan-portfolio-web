'use client'

import { useEffect, useRef, useState } from 'react'
import {
  COMMISSION_TYPES,
  FIELD_LABELS,
  USERS,
  getMilestonesForType,
  validateJobDates,
} from '../lib/jobUtils'

// Assignee dropdown options, derived from the fixed team list.
const ASSIGNEE_OPTIONS = USERS.map((u) => ({ value: u.id, label: u.name }))

// Right-hand edit/create form. Pure-presentational: it reads from `draft`,
// emits field changes via `onFieldChange`, and delegates Save / Restore /
// Delete / Close to the parent so that drafts can be preserved across opens.
export default function EditPanel({
  mode, // 'edit' | 'create'
  draft, // current in-progress job data
  isDirty, // whether draft differs from baseline
  onFieldChange, // (key, value) => void
  onSave, // () => void
  onRestore, // () => void
  onDelete, // () => void
  onClose, // () => void
}) {
  const [isProgressOpen, setIsProgressOpen] = useState(false)

  // Milestones this commission's type uses. Empty (e.g. Animation Only) hides
  // the Progress group entirely.
  const typeMilestones = getMilestonesForType(draft?.type)

  const validation = validateJobDates(draft)
  // Save is enabled only when (a) the draft differs from the baseline
  // (so Save and Restore visually toggle together based on dirty state)
  // and (b) the required fields are filled with a valid date order.
  const canSave =
    isDirty &&
    Boolean(draft?.commissionName?.trim()) &&
    Boolean(draft?.clientName?.trim()) &&
    Boolean(draft?.startDate) &&
    Boolean(draft?.deadline) &&
    validation.valid

  const title = mode === 'create' ? 'New Commission' : 'Edit Commission'
  const milestoneErrors = validation.errors

  return (
    <div
      data-edit-zone="edit-panel"
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e9ecf5] flex items-center justify-between bg-[#fafbff]">
        <div>
          <div
            className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-0.5 ${
              mode === 'create' ? 'text-[#5b8de8]' : 'text-[#ff69b4]'
            }`}
          >
            {mode === 'create' ? 'Add' : 'Edit'}
          </div>
          <div className="text-base font-bold text-[#2d2d3a] leading-tight">
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close edit panel"
          className="w-8 h-8 flex items-center justify-center rounded text-[#6b6b8a] hover:bg-white hover:text-[#2d2d3a] transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Field label="Type">
          <SelectInput
            value={draft?.type ?? COMMISSION_TYPES[0].value}
            onChange={(v) => onFieldChange('type', v)}
            options={COMMISSION_TYPES}
          />
        </Field>

        <Field label="Commission Name" required>
          <input
            type="text"
            value={draft?.commissionName ?? ''}
            onChange={(e) => onFieldChange('commissionName', e.target.value)}
            placeholder="e.g. 26.06 - Animated OC"
            className="w-full h-9 px-3 rounded border border-[#e0e4ee] bg-white text-sm text-[#2d2d3a] focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
          />
        </Field>

        <Field label="Client Name" required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a7a7b8] pointer-events-none">
              @
            </span>
            <input
              type="text"
              value={draft?.clientName ?? ''}
              onChange={(e) => onFieldChange('clientName', e.target.value)}
              placeholder="username"
              className="w-full h-9 pl-7 pr-3 rounded border border-[#e0e4ee] bg-white text-sm text-[#2d2d3a] focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
            />
          </div>
        </Field>

        <Field label="Assignee">
          <MultiSelectInput
            value={draft?.assignees ?? []}
            onChange={(v) => onFieldChange('assignees', v)}
            options={ASSIGNEE_OPTIONS}
            placeholder="Unassigned (common task)"
          />
        </Field>

        <Field label={FIELD_LABELS.startDate} required>
          <input
            type="date"
            value={draft?.startDate ?? ''}
            onChange={(e) => onFieldChange('startDate', e.target.value)}
            className="w-full h-9 px-3 rounded border border-[#e0e4ee] bg-white text-sm text-[#2d2d3a] focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
          />
        </Field>

        {/* Progress group — collapsed by default. Holds the milestones the
            current type uses. Pre-filled from startDate; cleared automatically
            when the deadline is too tight to fit them. Hidden entirely for
            types with no milestones (e.g. Animation Only). */}
        {typeMilestones.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setIsProgressOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 h-9 rounded bg-[#f4f6fc] hover:bg-[#eef2fc] transition-colors"
            >
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#5b5bd6]">
                Progress
              </span>
              <span
                className="text-[#5b5bd6] transition-transform"
                style={{
                  transform: isProgressOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <ChevronDownSmall />
              </span>
            </button>
            {isProgressOpen && (
              <div className="mt-3 pl-3 border-l-2 border-[#e9ecf5] space-y-3">
                {typeMilestones.map((m) => (
                  <Field key={m.key} label={FIELD_LABELS[m.key]}>
                    <input
                      type="date"
                      value={draft?.[m.key] ?? ''}
                      onChange={(e) => onFieldChange(m.key, e.target.value)}
                      className="w-full h-9 px-3 rounded border border-[#e0e4ee] bg-white text-sm text-[#2d2d3a] focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
                    />
                  </Field>
                ))}
                {typeMilestones.some((m) => !draft?.[m.key]) && (
                  <div className="text-[11px] text-[#a7a7b8] italic">
                    Some milestones are empty — usually because the deadline is
                    too tight for the standard weekly progression.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Field label={FIELD_LABELS.deadline} required>
          <input
            type="date"
            value={draft?.deadline ?? ''}
            onChange={(e) => onFieldChange('deadline', e.target.value)}
            className="w-full h-9 px-3 rounded border border-[#e0e4ee] bg-white text-sm text-[#2d2d3a] focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
          />
        </Field>

        {/* Validation errors */}
        {!validation.valid && (
          <div className="rounded border border-[#ffcad4] bg-[#fff4f7] px-3 py-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#d6336c] mb-1">
              Fix these before saving
            </div>
            <ul className="text-xs text-[#a8345b] list-disc pl-4 space-y-0.5">
              {milestoneErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#e9ecf5] bg-[#fafbff] flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="h-9 px-4 rounded text-xs font-bold uppercase tracking-wider bg-[#5b5bd6] text-white hover:bg-[#4a4ac4] disabled:bg-[#d4d6e3] disabled:cursor-not-allowed transition-colors"
        >
          {mode === 'create' ? 'Add' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onRestore}
          disabled={!isDirty}
          className="h-9 px-4 rounded text-xs font-bold uppercase tracking-wider bg-white border border-[#e0e4ee] text-[#6b6b8a] hover:text-[#2d2d3a] hover:border-[#c8cee0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Restore
        </button>
        <div className="flex-1" />
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDelete}
            className="h-9 px-4 rounded text-xs font-bold uppercase tracking-wider bg-white border border-[#ffcad4] text-[#d6336c] hover:bg-[#fff4f7] transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-[#6b6b8a] font-bold">
          {label}
          {required && <span className="text-[#ff69b4] ml-1">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] text-[#a7a7b8] italic">{hint}</span>
        )}
      </div>
      {children}
    </label>
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 pl-3 pr-8 rounded border border-[#e0e4ee] bg-white text-sm text-[#2d2d3a] appearance-none focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#a7a7b8]">
        <ChevronDownSmall />
      </span>
    </div>
  )
}

// Multi-select dropdown with tickable options. `value` is an array of option
// values; `onChange` receives the next array. Closes on an outside click.
function MultiSelectInput({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = Array.isArray(value) ? value : []

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const summary =
    selected.length === 0
      ? placeholder
      : options
          .filter((o) => selected.includes(o.value))
          .map((o) => o.label)
          .join(', ')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full h-9 pl-3 pr-8 rounded border border-[#e0e4ee] bg-white text-sm text-left flex items-center focus:outline-none focus:border-[#5b5bd6] focus:ring-2 focus:ring-[#5b5bd6]/15"
      >
        <span
          className={`truncate ${
            selected.length === 0 ? 'text-[#a7a7b8]' : 'text-[#2d2d3a]'
          }`}
        >
          {summary}
        </span>
      </button>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#a7a7b8]">
        <ChevronDownSmall />
      </span>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded border border-[#e0e4ee] bg-white py-1 shadow-lg">
          {options.map((opt) => {
            const checked = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2.5 px-3 h-9 text-sm text-left hover:bg-[#f4f6fc] transition-colors"
              >
                <CheckBox checked={checked} />
                <span className="text-[#2d2d3a]">{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CheckBox({ checked }) {
  return (
    <span
      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors flex-none ${
        checked ? 'bg-[#5b5bd6] border-[#5b5bd6]' : 'bg-white border-[#c8cee0]'
      }`}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDownSmall() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
