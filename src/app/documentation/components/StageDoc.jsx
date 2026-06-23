'use client'

import { tagStyle } from '../lib/pipelineUtils'
import { findRefByHandoffType } from '../data/references'
import StageThumb from './StageThumb'
import FileIcon from './FileIcon'
import RichText from './RichText'
import DocHeading from './DocHeading'

// Full documentation page for a single pipeline stage. The description carries
// inline glossary terms (link to Technical Definitions); tool names link to
// their Applications & Plugins page. Handoff/term/tool links all use onSelect.
export default function StageDoc({ stage, onSelect }) {
  return (
    <article style={{ '--accent': stage.accent }}>
      {/* Heading: representative logo (collapses left if missing) + title */}
      <DocHeading icon={<StageThumb rep={stage.rep} size={64} noFallback />}>
        <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">{stage.label}</h1>
        <p className="text-sm italic text-[#6b6b8a]">{stage.sub}</p>
      </DocHeading>

      <p className="mt-5 text-[15px] leading-relaxed text-[#3a3a52]">
        <RichText tokens={stage.description} onSelect={onSelect} />
      </p>

      {stage.warn && (
        <div className="mt-4 rounded-xl border border-[#ffe2c2] bg-[#fff8ef] px-4 py-3 text-xs leading-relaxed text-[#8a5a1f]">
          ⚠️ {stage.warn}
        </div>
      )}

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <Block title="Tools">
          <ToolList items={stage.tools} onSelect={onSelect} />
        </Block>

        {stage.plugins?.length ? (
          <Block title="Plugins & inputs">
            <ToolList items={stage.plugins} onSelect={onSelect} />
          </Block>
        ) : null}
      </div>

      {stage.callouts?.map((c) => (
        <div key={c.title} className="mt-5 rounded-xl border border-[#e2e4f0] bg-[#f7f8fc] px-4 py-3">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: stage.accent }}
          >
            {c.title}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#4a4a63]">{c.body}</p>
        </div>
      ))}

      {stage.handoff && (
        <Block title="Handoff to next stage" className="mt-7">
          <div className="rounded-xl border border-[#e2e4f0] bg-[#f7f8fc] px-4 py-3">
            <ul className="flex flex-wrap gap-2">
              {stage.handoff.files.map((f) => (
                <HandoffChip key={f.label} file={f} onSelect={onSelect} />
              ))}
            </ul>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-[#6b6b8a]">
              {stage.handoff.text}
            </p>
            <button
              type="button"
              onClick={() => onSelect(stage.handoff.to)}
              className="mt-2 text-xs font-bold text-[#ff69b4] hover:underline"
            >
              Open next stage →
            </button>
          </div>
        </Block>
      )}
    </article>
  )
}

function Block({ title, children, className = '' }) {
  return (
    <div className={className}>
      <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
        {title}
      </h2>
      {children}
    </div>
  )
}

// A handoff file chip. Navigates to its reference page in-place when documented.
function HandoffChip({ file, onSelect }) {
  const ref = findRefByHandoffType(file.type)
  const inner = (
    <>
      <FileIcon type={file.type} />
      {file.label}
    </>
  )

  if (!ref) {
    return (
      <li className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#4a4a63]">
        {inner}
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(ref.id)}
        className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#4a4a63] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:text-[#5b4bd6] hover:decoration-[#5b4bd6]"
      >
        {inner}
      </button>
    </li>
  )
}

// Tool/plugin row. The name is a link to the application's reference page.
function ToolList({ items, onSelect }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const tag = tagStyle(item.tag)
        return (
          <li key={item.name} className="rounded-xl border border-[#e2e4f0] bg-white px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => item.app && onSelect(item.app)}
                className="text-left text-sm font-bold text-[#5b4bd6] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:text-[#ff69b4] hover:decoration-[#ff69b4]"
              >
                {item.name}
              </button>
              {item.tag && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: tag.bg, color: tag.fg }}
                >
                  {tag.text}
                </span>
              )}
            </div>
            {item.note && <p className="mt-1 text-xs leading-relaxed text-[#6b6b8a]">{item.note}</p>}
          </li>
        )
      })}
    </ul>
  )
}
