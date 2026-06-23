'use client'

import { findStage } from '../lib/pipelineUtils'
import MiniPipeline from './MiniPipeline'
import DocHeading from './DocHeading'

// Reference page for a single technical definition (a concept or live protocol).
// The "In the pipeline" section reuses the diagram, narrowed to the stages where
// the concept is relevant.
export default function TechDefDoc({ techDef, onSelect }) {
  const nodes = (techDef.relatedStages || [])
    .map((id) => findStage(id))
    .filter(Boolean)
    .map((stage) => ({ kind: 'stage', stage }))

  return (
    <article>
      {/* Heading (no logo for concepts — collapses flush-left) */}
      <DocHeading>
        <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">{techDef.term}</h1>
        <p className="mt-0.5 text-sm italic text-[#6b6b8a]">{techDef.summary}</p>
      </DocHeading>

      {/* Definition */}
      <section className="mt-7">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
          Definition
        </h2>
        <p className="text-[15px] leading-relaxed text-[#3a3a52]">{techDef.definition}</p>
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
