'use client'

import { useEffect, useRef, useState } from 'react'
import languageIcon from '@/app/commission/assets/language-icon.webp'
import { LANGUAGES, todayISO } from '../data/docs'

// Light strip under the masthead: Change Log (date picker, only today for now)
// on the left, the site's sliding EN/VN toggle on the right.
export default function DocsSubBar({ lang, onLang }) {
  const today = todayISO()
  const [changeDate, setChangeDate] = useState(today)
  const dates = [today] // older snapshots will be appended here later

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#d9dbe6] bg-[#ededf2] px-4 text-sm text-[#4a4a63]">
      <Dropdown
        label={
          <span>
            <span className="text-[#8a8aa3]">Change Log: </span>
            <span className="font-semibold">{changeDate}</span>
          </span>
        }
        items={dates.map((d) => ({ id: d, label: d }))}
        activeId={changeDate}
        onSelect={setChangeDate}
        align="left"
      />

      <LangToggle lang={lang} onLang={onLang} />
    </div>
  )
}

// Sliding pill toggle copied from the site's main Navigation: pale container,
// a white pill that slides under the active option.
function LangToggle({ lang, onLang }) {
  const activeIndex = Math.max(
    0,
    LANGUAGES.findIndex((l) => l.id === lang)
  )

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={languageIcon.src}
        alt="Language"
        className="h-5 w-5 object-contain opacity-70"
      />
      <div className="rounded-lg bg-[#f5f5ff] p-1">
        <div className="relative flex items-center">
          {/* Sliding white background */}
          <div
            className="pointer-events-none absolute top-0 h-full rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out"
            style={{
              width: `${100 / LANGUAGES.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
          {LANGUAGES.map((l) => {
            const active = l.id === lang
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onLang(l.id)}
                className={`relative z-10 cursor-pointer select-none rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                  active ? 'text-[#39327f]' : 'text-[#999999]'
                }`}
              >
                {l.short}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Dropdown({ label, items, activeId, onSelect, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/70"
      >
        {label}
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          className={`absolute top-full z-40 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[#e2e4f0] bg-white py-1 shadow-[0_8px_24px_rgba(45,45,58,0.16)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(it.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-[#f3f3f9] ${
                  it.id === activeId ? 'font-semibold text-[#5b4bd6]' : 'text-[#4a4a63]'
                }`}
              >
                {it.label}
                {it.id === activeId && <span className="text-[#ff69b4]">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
