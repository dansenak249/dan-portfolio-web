'use client'

import { findStage } from '../lib/pipelineUtils'
import FileIcon from './FileIcon'
import MiniPipeline from './MiniPipeline'
import DocHeading from './DocHeading'

// Reference page for a single file extension. The "In the pipeline" section is
// the same diagram as the Overview, narrowed to the producer -> file -> consumer
// nodes for this format.
export default function FileDoc({ fileType, onSelect }) {
  const producer = findStage(fileType.producedBy)
  const consumer = findStage(fileType.consumedBy)

  const nodes = []
  if (producer) nodes.push({ kind: 'stage', stage: producer })
  nodes.push({ kind: 'file', label: fileType.navLabel, type: fileType.icon })
  if (consumer) nodes.push({ kind: 'stage', stage: consumer })

  return (
    <article>
      {/* Heading: the file-type icon is a real glyph, so it always shows */}
      <DocHeading
        icon={
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#e2e4f0] bg-[#f7f8fc]">
            <FileIcon type={fileType.icon} size={34} />
          </div>
        }
      >
        <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">{fileType.name}</h1>
        <p className="mt-0.5 font-mono text-sm text-[#6b6b8a]">{fileType.extension}</p>
      </DocHeading>

      {/* Technical definition */}
      <section className="mt-7">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
          Technical definition
        </h2>
        <p className="text-[15px] leading-relaxed text-[#3a3a52]">{fileType.technical}</p>
      </section>

      {/* File extension */}
      <section className="mt-7">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
          File extension
        </h2>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#e2e4f0] bg-white px-3 py-2">
          <FileIcon type={fileType.icon} />
          <code className="font-mono text-sm font-bold text-[#2d2d3a]">{fileType.extension}</code>
        </div>
      </section>

      {/* In the pipeline */}
      <section className="mt-7">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
          In the pipeline
        </h2>
        <MiniPipeline nodes={nodes} onSelect={onSelect} />
      </section>
    </article>
  )
}
