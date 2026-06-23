'use client'

import {
  sortedTechDefs,
  sortedFileExtensions,
  sortedApplications,
} from '../data/references'

// The References group page: a short intro plus three category cards, each
// linking to the individual reference pages.
export default function ReferencesIntro({ onSelect }) {
  const categories = [
    {
      title: 'Technical Definition',
      blurb: 'Concepts and live protocols referenced across the pipeline — what rigging is, what a blendshape is, how Spout2 and RTMP work.',
      items: sortedTechDefs().map((t) => ({ id: t.id, label: t.term })),
    },
    {
      title: 'File Extensions',
      blurb: 'The real files that pass between stages, each with a plain-language definition and where it flows in the pipeline.',
      items: sortedFileExtensions().map((f) => ({ id: f.id, label: f.navLabel })),
    },
    {
      title: 'Applications & Plugins',
      blurb: 'Every piece of software, plugin and platform used across the pipeline, in one alphabetical list.',
      items: sortedApplications().map((a) => ({ id: a.id, label: a.name })),
    },
  ]

  return (
    <article>
      <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">References</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#3a3a52]">
        A shared glossary for the whole documentation. Stage pages link into these references: inline
        terms open a Technical Definition, handoff files open a File Extension, and tool names open an
        Applications &amp; Plugins page. Browse a category below or use the sidebar.
      </p>

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {categories.map((cat) => (
          <section
            key={cat.title}
            className="flex flex-col rounded-2xl border border-[#e2e4f0] bg-[#f7f8fc] p-4"
          >
            <h2 className="text-sm font-bold text-[#2d2d3a]">{cat.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6b6b8a]">{cat.blurb}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {cat.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className="rounded-full border border-[#e2e4f0] bg-white px-2.5 py-1 text-xs font-medium text-[#5b5b7a] transition-colors hover:border-[#7978e6] hover:text-[#5b4bd6]"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  )
}
