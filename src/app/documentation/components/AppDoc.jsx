'use client'

import { findStage, tagStyle } from '../lib/pipelineUtils'
import { rigTutorialLinks } from '../data/rigTutorials'
import MiniPipeline from './MiniPipeline'
import DocHeading from './DocHeading'

// Reference page for a single application, plugin or platform. The "In the
// pipeline" section reuses the diagram, narrowed to the stage(s) where the app
// is used.
export default function AppDoc({ app, onSelect }) {
  const tag = tagStyle(app.tag)
  // Live2D Cubism nests the five Editor tutorials. Surface them as explicit
  // links so users who miss the sidebar still find the next rig steps.
  const tutorials = app.id === 'live2d-cubism' ? rigTutorialLinks : []
  const nodes = (app.stages || [])
    .map((id) => findStage(id))
    .filter(Boolean)
    .map((stage) => ({ kind: 'stage', stage }))

  return (
    <article>
      {/* Heading (no logo for apps — collapses flush-left) */}
      <DocHeading>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">{app.name}</h1>
          {app.tag && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: tag.bg, color: tag.fg }}
            >
              {tag.text}
            </span>
          )}
        </div>
        {app.vendor && <p className="mt-0.5 text-sm italic text-[#6b6b8a]">by {app.vendor}</p>}
      </DocHeading>

      <p className="mt-5 text-[17px] leading-relaxed text-[#3a3a52]">{app.description}</p>

      {app.callout && (
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5b4bd6]">
            {app.callout.title}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[#4a4a63]">{app.callout.body}</p>
        </div>
      )}

      {/* In the pipeline */}
      {nodes.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
            In the pipeline
          </h2>
          <MiniPipeline nodes={nodes} onSelect={onSelect} />
        </section>
      )}

      {/* Editor tutorials (Live2D Cubism only) */}
      {tutorials.length > 0 && (
        <section className="mt-7 max-w-2xl">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
            Editor tutorials
          </h2>
          <ul className="flex flex-col">
            {tutorials.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className="flex w-full items-center gap-2 py-1.5 text-left text-sm font-medium text-[#5b4bd6] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:text-[#ff69b4] hover:decoration-[#ff69b4]"
                >
                  <span className="text-xs font-bold text-[#9a9ab5]">{i + 1}.</span>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
