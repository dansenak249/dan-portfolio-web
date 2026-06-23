'use client'

import { BRAND } from '../data/docs'

// Dark masthead: brand (logo optional) on the left; search + Manual/API tabs
// pushed to the right edge (Unity-style). Search is UI-only for now.
export default function DocsHeader({ tab, onTab }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-5 bg-[#222431] px-4 text-white">
      {/* Brand: logo only renders when set, otherwise the title sits flush-left */}
      <div className="flex items-center gap-2">
        {BRAND.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={BRAND.logo} alt="" className="h-7 w-7 object-contain" />
        )}
        <span className="text-base font-bold tracking-wide">
          {BRAND.name} <span className="font-normal text-white/75">{BRAND.suffix}</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-6">
        <div className="relative hidden sm:block">
          <input
            type="text"
            placeholder="Search manual..."
            aria-label="Search manual"
            className="h-9 w-56 rounded-md border border-white/15 bg-white/95 pl-3 pr-9 text-sm text-[#2d2d3a] placeholder:text-[#9a9ab5] focus:outline-none focus:ring-2 focus:ring-[#ff69b4]/60"
          />
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6b8a]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <nav className="flex items-center gap-5 text-sm">
          <TabLink active={tab === 'manual'} onClick={() => onTab('manual')}>
            Manual
          </TabLink>
          <TabLink active={tab === 'api'} onClick={() => onTab('api')}>
            API
          </TabLink>
        </nav>
      </div>
    </header>
  )
}

function TabLink({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative h-14 w-16 text-center text-sm font-semibold transition-colors ${
        active ? 'text-white' : 'text-white/65 hover:text-white'
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#ff69b4]" />
      )}
    </button>
  )
}
