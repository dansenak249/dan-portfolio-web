'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LoadingScreen from '@/components/LoadingScreen'

// Persisted config schema. These are the "rest of the inputs" the user
// configures rarely via the secondary panel. Client Paid + gateway pick
// stay on the main panel.
const DEFAULT_CONFIG = {
  extra: 0, // money dealt privately with client, excluded from cost
  vgenPct: 5, // VGen platform fee, % of Client Paid
  paypalPct: 4.35, // Paypal: % of Client Paid + fixed
  paypalFixed: 0.5,
  stripePct: 2.9, // Stripe: % of Client Paid + fixed
  stripeFixed: 0.3,
  locPct: 40, // Loc share, % of Net
  salaPct: 15, // Sala share, % of Net
}

const STORAGE_KEY = 'vgen-calc-config'

// Display names for the two output shares.
const LOC_NAME = 'Phan Thien Loc'
const SALA_NAME = 'Le Van Nguyen Dan'

// Logo black, taken from the VGen wordmark.
const LOGO_BLACK = '#1a1a1a'

// Gateways live in an array so adding a new one later is a one-line
// change. icon points at /public/tools/vgen-calc/<file>.png.
const GATEWAYS = [
  { id: 'paypal', label: 'Paypal', icon: '/tools/vgen-calc/paypal.png' },
  { id: 'stripe', label: 'Stripe', icon: '/tools/vgen-calc/stripe.png' },
]

// Parse a user-entered number, tolerating empty/garbage as a fallback.
function toNumber(value, fallback = 0) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

// Format as USD with 2 decimals. Negative values keep the sign so a
// loss-making breakdown is honest rather than hidden.
function usd(value) {
  const n = Number.isFinite(value) ? value : 0
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`
}

// Merge persisted config with defaults so a partial/old payload never
// leaves a field undefined.
function normalizeConfig(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG }
  const out = { ...DEFAULT_CONFIG }
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key])) {
      out[key] = raw[key]
    }
  }
  return out
}

// Pure calculation. Net = Client Paid - Extra - VGen - Gateway.
function calculate(clientPaid, gateway, config) {
  const cp = toNumber(clientPaid, 0)
  const extra = config.extra
  const vgen = cp * (config.vgenPct / 100)
  const gateway_fee =
    gateway === 'paypal'
      ? cp * (config.paypalPct / 100) + config.paypalFixed
      : cp * (config.stripePct / 100) + config.stripeFixed
  const net = cp - extra - vgen - gateway_fee
  return {
    clientPaid: cp,
    extra,
    vgen,
    gateway_fee,
    net,
    loc: net * (config.locPct / 100),
    sala: net * (config.salaPct / 100),
  }
}

const EMPTY_RESULT = {
  clientPaid: 0,
  extra: 0,
  vgen: 0,
  gateway_fee: 0,
  net: 0,
  loc: 0,
  sala: 0,
}

export default function VGenCalculator() {
  const [clientPaid, setClientPaid] = useState('')
  const [gateway, setGateway] = useState('paypal')
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [showConfig, setShowConfig] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Load persisted config once on mount, then drop the loading gate.
  // Reading localStorage must happen client-side (post-hydration) to
  // avoid an SSR/client markup mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = normalizeConfig(JSON.parse(raw))
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating persisted config + releasing the mount gate from an external store
        setConfig(parsed)
      }
    } catch {
      // Corrupt/blocked storage — keep defaults silently.
    }
    setIsInitializing(false)
  }, [])

  // Auto-calculate on any change. Empty input shows a clean zero state
  // instead of a negative number from the fixed gateway fee.
  const result = useMemo(() => {
    if (clientPaid.trim() === '') return EMPTY_RESULT
    return calculate(clientPaid, gateway, config)
  }, [clientPaid, gateway, config])

  const gatewayLabel = useMemo(
    () => GATEWAYS.find((g) => g.id === gateway)?.label ?? gateway,
    [gateway]
  )

  const persistConfig = (next) => {
    setConfig(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage write failures (private mode, quota, etc).
    }
  }

  if (isInitializing) {
    return <LoadingScreen />
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center py-10 px-4 sm:px-6"
      style={{ backgroundColor: '#eef0fb' }}
    >
      <div
        className="relative w-full bg-white rounded-2xl overflow-hidden"
        style={{
          maxWidth: 560,
          boxShadow: '0 24px 70px rgba(67, 56, 202, 0.16)',
        }}
      >
        {/* Header — flat white, VGen logo + black wordmark, square
            icon-only config button aligned on the same row. */}
        <div className="px-7 pt-7 pb-5 flex items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="/tools/vgen-calc/vgen.png"
              alt="VGen"
              className="block w-auto"
              style={{ height: 28 }}
            />
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{
                color: LOGO_BLACK,
                lineHeight: 1,
                // Font has large ascent metrics, so glyphs sit low in
                // the line box. Nudge up to optically center with logo.
                transform: 'translateY(-0.12em)',
              }}
            >
              Fee Calculator
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
            style={{ color: LOGO_BLACK }}
            aria-label="Open configuration"
          >
            <GearIcon />
          </button>
        </div>

        {/* Main panel — the only fields touched per-calculation. */}
        <div className="px-7 py-7">
          <Field label="Client Paid" hint="Amount paid by client (USD)">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold pointer-events-none">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={clientPaid}
                onChange={(e) => setClientPaid(e.target.value)}
                placeholder="0.00"
                className="w-full h-14 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xl font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
              />
            </div>
          </Field>

          <div className="mt-5">
            <Field label="Gateway" hint="Payment gateway used">
              <GatewayDropdown value={gateway} onChange={setGateway} />
            </Field>
          </div>

          {/* Result — always present so the frame never resizes. */}
          <ResultPanel
            result={result}
            gatewayLabel={gatewayLabel}
            config={config}
          />
        </div>
      </div>

      {showConfig && (
        <ConfigModal
          config={config}
          onClose={() => setShowConfig(false)}
          onSave={persistConfig}
        />
      )}
    </div>
  )
}

// ---------- Gateway dropdown ----------

function GatewayDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = GATEWAYS.find((g) => g.id === value) ?? GATEWAYS[0]

  // Close on outside click. Listener only attached while open.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <GatewayIcon src={current.icon} label={current.label} />
          {current.label}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          className="absolute z-20 left-0 right-0 mt-2 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {GATEWAYS.map((g) => {
            const active = g.id === value
            return (
              <li key={g.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(g.id)
                    setOpen(false)
                  }}
                  className={`w-full px-4 h-11 flex items-center gap-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <GatewayIcon src={g.icon} label={g.label} />
                  {g.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function GatewayIcon({ src, label }) {
  return (
    <img
      src={src}
      alt={label}
      width={18}
      height={18}
      className="object-contain"
      style={{ width: 18, height: 18 }}
    />
  )
}

// ---------- Result ----------

function ResultPanel({ result, gatewayLabel, config }) {
  return (
    <div className="mt-7">
      {/* Cost breakdown — every subtraction shown so the math is auditable.
          Rate hints sit in a left-aligned column hugging the value column. */}
      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        <BreakdownRow label="Client Paid" value={usd(result.clientPaid)} />
        <BreakdownRow label="Extra" value={`- ${usd(result.extra)}`} muted />
        <BreakdownRow
          label="VGen"
          sub={`${config.vgenPct}%`}
          value={`- ${usd(result.vgen)}`}
          muted
        />
        <BreakdownRow
          label={`Gateway · ${gatewayLabel}`}
          sub={
            gatewayLabel === 'Paypal'
              ? `${config.paypalPct}% + ${usd(config.paypalFixed)}`
              : `${config.stripePct}% + ${usd(config.stripeFixed)}`
          }
          value={`- ${usd(result.gateway_fee)}`}
          muted
        />
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
          <span className="text-sm font-bold text-slate-700">Net</span>
          <span
            className="text-lg font-bold"
            style={{ color: result.net < 0 ? '#dc2626' : '#0f766e' }}
          >
            {usd(result.net)}
          </span>
        </div>
      </div>

      {/* Final shares — the numbers the user actually sends. Grouped
          under a sub-header matching the Client Paid / Gateway fields. */}
      <div className="mt-6">
        <Field label="Revenue Share">
          <div className="grid grid-cols-2 gap-3">
            <ShareCard
              name={LOC_NAME}
              pct={config.locPct}
              value={usd(result.loc)}
              accent="#4338ca"
              bg="#eef2ff"
            />
            <ShareCard
              name={SALA_NAME}
              pct={config.salaPct}
              value={usd(result.sala)}
              accent="#7c3aed"
              bg="#f5f3ff"
            />
          </div>
        </Field>
      </div>
    </div>
  )
}

function BreakdownRow({ label, sub, value, muted }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-4">
        <span className="w-20 text-left text-xs text-slate-400">
          {sub ?? ''}
        </span>
        <span
          className={`w-20 text-right text-sm font-semibold ${
            muted ? 'text-slate-400' : 'text-slate-700'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

function ShareCard({ name, pct, value, accent, bg }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-bold leading-tight"
          style={{ color: accent }}
        >
          {name}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
          {pct}%
        </span>
      </div>
      <span className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </span>
    </div>
  )
}

// ---------- Config modal ----------

function ConfigModal({ config, onClose, onSave }) {
  // Local draft — only committed to parent/localStorage on Save so the
  // user can cancel without side effects. The modal remounts each time
  // it opens, so the initializer always captures the latest config.
  const [draft, setDraft] = useState(config)

  const setField = (key) => (e) =>
    setDraft((prev) => ({ ...prev, [key]: toNumber(e.target.value, 0) }))

  // Reset only the in-progress draft; nothing persists until Save.
  const handleReset = () => setDraft({ ...DEFAULT_CONFIG })

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30, 27, 75, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ maxWidth: 480, boxShadow: '0 24px 70px rgba(30,27,75,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Configuration</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <ConfigSection title="General">
            <ConfigInput
              label="Extra"
              suffix="$"
              step="1"
              value={draft.extra}
              onChange={setField('extra')}
            />
          </ConfigSection>

          <ConfigSection title="Transaction Fee">
            <ConfigInput
              label="VGen"
              suffix="%"
              value={draft.vgenPct}
              onChange={setField('vgenPct')}
            />
            <GatewayFeeRow
              name="Paypal"
              rate={{
                value: draft.paypalPct,
                onChange: setField('paypalPct'),
              }}
              fixed={{
                value: draft.paypalFixed,
                onChange: setField('paypalFixed'),
              }}
            />
            <GatewayFeeRow
              name="Stripe"
              rate={{
                value: draft.stripePct,
                onChange: setField('stripePct'),
              }}
              fixed={{
                value: draft.stripeFixed,
                onChange: setField('stripeFixed'),
              }}
            />
          </ConfigSection>

          <ConfigSection title="Revenue share">
            <ConfigInput
              label={LOC_NAME}
              suffix="%"
              value={draft.locPct}
              onChange={setField('locPct')}
            />
            <ConfigInput
              label={SALA_NAME}
              suffix="%"
              value={draft.salaPct}
              onChange={setField('salaPct')}
            />
          </ConfigSection>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="h-11 px-4 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Reset
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-6 rounded-xl text-sm font-bold text-white transition-transform active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfigSection({ title, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// A gateway fee laid out as its real formula: rate + fixed. The gateway
// name sits on the rate box (where the "Rate" label used to be); the
// fixed box is label-less. items-end keeps both inputs bottom-aligned.
function GatewayFeeRow({ name, rate, fixed }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <ConfigInput
          label={name}
          suffix="%"
          value={rate.value}
          onChange={rate.onChange}
        />
      </div>
      <span
        className="text-lg font-bold text-slate-400 leading-none"
        style={{ marginBottom: 12 }}
      >
        +
      </span>
      <div className="flex-1">
        <ConfigInput suffix="$" value={fixed.value} onChange={fixed.onChange} />
      </div>
    </div>
  )
}

function ConfigInput({ label, suffix, value, onChange, step = '0.01' }) {
  return (
    <label className="block">
      {label && (
        <span className="text-sm font-medium text-slate-600">{label}</span>
      )}
      <div className={`relative ${label ? 'mt-1' : ''}`}>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={onChange}
          className="w-full h-11 pl-3 pr-9 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">
          {suffix}
        </span>
      </div>
    </label>
  )
}

// ---------- UI helpers ----------

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
