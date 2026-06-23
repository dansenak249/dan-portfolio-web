'use client'

import StageCell from './StageCell'
import FileIcon from './FileIcon'

// A compact pipeline diagram for reference pages: the same cell visuals as the
// Overview, but only the nodes relevant to the current page. `nodes` is an
// ordered list of either a stage cell or a file/format chip, joined by arrows.
//
// node shapes:
//   { kind: 'stage', stage }            -> clickable StageCell (compact)
//   { kind: 'file', label, type }       -> a static file/format chip
export default function MiniPipeline({ nodes, onSelect }) {
  return (
    <div className="rounded-2xl border border-[#e2e4f0] bg-[#f7f8fc] p-4">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {nodes.map((node, i) => (
          <li key={node.kind === 'stage' ? node.stage.id : `${node.label}-${i}`} className="flex items-center">
            {node.kind === 'stage' ? (
              <StageCell stage={node.stage} onSelect={onSelect} compact />
            ) : (
              <span className="flex items-center gap-1.5 rounded-lg border border-[#e2e4f0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4a4a63]">
                <FileIcon type={node.type} />
                {node.label}
              </span>
            )}
            {i < nodes.length - 1 && <span className="px-3 text-lg text-[#a9aed0]">→</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}
