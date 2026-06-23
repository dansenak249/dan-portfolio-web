'use client'

import { pipeline } from '../data/pipeline'
import PipelineMap from './PipelineMap'

// Links shown under "Additional resources". Rigging has a dedicated Technical
// Definition page; tracker and compositing point at their stage pages (no
// standalone concept page exists for them yet).
const ADDITIONAL_RESOURCES = [
  { id: 'rigging', label: 'Rigging' },
  { id: 'tracking', label: 'Tracker' },
  { id: 'compositing', label: 'Composite' },
]

// The Vtuber Pipeline group page: the interactive diagram, a Unity-style summary
// table of every stage, and an Additional resources list. EDIT data/pipeline.js
// (stage `label` + `blurb`) to change the table rows.
export default function PipelineOverview({ onSelect }) {
  return (
    <article>
      <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">Vtuber Pipeline</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#3a3a52]">
        The end-to-end flow for producing and streaming a Live2D VTuber. Each stage hands a specific
        file or feed to the next. Click a cell to open that stage&apos;s page, or hover the arrows to
        see what gets handed off between stages.
      </p>

      <div className="mt-6">
        <PipelineMap stages={pipeline} onSelect={onSelect} />
      </div>

      {/* Unity-style summary table: stage name + short description. */}
      <section className="mt-8 border border-[#ebebeb]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#ebebeb]">
              <th className="w-1/4 border-r border-[#ebebeb] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d2d3a]">
                Stage
              </th>
              <th className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d2d3a]">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((stage) => (
              <tr key={stage.id} className="border-t border-[#ebebeb] align-top">
                <td className="border-r border-[#ebebeb] px-4 py-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(stage.id)}
                    className="text-left text-sm font-semibold text-[#5b4bd6] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:text-[#ff69b4] hover:decoration-[#ff69b4]"
                  >
                    {stage.label}
                  </button>
                </td>
                <td className="px-4 py-1.5 text-sm leading-relaxed text-[#2d2d3a]">{stage.blurb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Additional resources */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-[#2d2d3a]">Additional resources</h2>
        <ul className="mt-3 space-y-1.5">
          {ADDITIONAL_RESOURCES.map((res) => (
            <li key={res.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3ec4a0]" />
              <button
                type="button"
                onClick={() => onSelect(res.id)}
                className="text-sm text-[#5b4bd6] underline decoration-[#c4c4dd] underline-offset-2 transition-colors hover:text-[#ff69b4] hover:decoration-[#ff69b4]"
              >
                {res.label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
