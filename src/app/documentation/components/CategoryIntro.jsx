'use client'

// Intro article for a References sub-category (Technical Definition, File
// Extensions, Applications & Plugins). Mirrors the group overview pages: a
// title, one or more intro paragraphs, then a quick-link list into every entry
// the category contains. Content comes from data/references.js (categoryIntros).
export default function CategoryIntro({ category, onSelect }) {
  return (
    <article>
      <h1 className="text-3xl font-bold leading-tight text-[#2d2d3a]">{category.title}</h1>

      {category.intro.map((para, i) => (
        <p key={i} className="mt-3 text-[15px] leading-relaxed text-[#3a3a52]">
          {para}
        </p>
      ))}

      <section className="mt-7">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a9ab5]">
          In this category
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {category.items.map((item) => (
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
    </article>
  )
}
