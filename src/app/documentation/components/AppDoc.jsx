'use client'

import { findStage, tagStyle } from '../lib/pipelineUtils'
import MiniPipeline from './MiniPipeline'
import DocHeading from './DocHeading'

// Reference page for a single application, plugin or platform. The "In the
// pipeline" section reuses the diagram, narrowed to the stage(s) where the app
// is used.
export default function AppDoc({ app, onSelect }) {
  const tag = tagStyle(app.tag)
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

      {/* Overview */}
      <section className="mt-7">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
          Overview
        </h2>
        <p className="text-[15px] leading-relaxed text-[#3a3a52]">{app.description}</p>
      </section>

      {/* In the pipeline */}
      {nodes.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
            In the pipeline
          </h2>
          <MiniPipeline nodes={nodes} onSelect={onSelect} />
        </section>
      )}
    </article>
  )
}
