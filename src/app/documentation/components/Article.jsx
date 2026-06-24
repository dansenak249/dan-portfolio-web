'use client'

// Shared, self-contained tutorial article renderer. Used by StageDoc (the
// embedded stage tutorial) and TutorialDoc (the standalone Rig sub-tutorial
// pages). The body of each section is an ordered list of content blocks so
// images sit right after the paragraph that describes them. Plain <img>/<video>
// keep it self-contained for the offline and presentation exports.
export default function Article({ article, accent }) {
  return (
    <section className="mt-9 border-t border-[#e2e4f0] pt-7">
      {article.intro?.map((p, i) => (
        <p key={i} className="mt-3 text-[17px] leading-relaxed text-[#3a3a52]">
          {p}
        </p>
      ))}

      {article.toolsNote && (
        <div className="mt-4 rounded-xl border border-[#e2e4f0] bg-[#f7f8fc] px-4 py-3 text-sm leading-relaxed text-[#4a4a63]">
          {article.toolsNote}
        </div>
      )}

      {article.video?.youtube && (
        <figure className="my-6 max-w-2xl">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-[#e2e4f0]">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={youtubeEmbedUrl(article.video.youtube)}
              title={article.video.caption || 'Tutorial video'}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          {article.video.caption && (
            <figcaption className="mt-2 text-xs italic text-[#9a9ab5]">
              {article.video.caption}
            </figcaption>
          )}
        </figure>
      )}

      {article.sections?.map((sec) => (
        <div key={sec.heading} className="mt-8">
          <h3 className="text-2xl font-bold text-[#2d2d3a]">{sec.heading}</h3>

          {sec.body && <ArticleBlocks blocks={sec.body} accent={accent} variant="body" />}

          {sec.subsections?.map((sub) => (
            <div key={sub.title} className="mt-5">
              <h4 className="text-lg font-bold text-[#5b4bd6]">{sub.title}</h4>
              <ArticleBlocks blocks={sub.body} accent={accent} variant="body" />
            </div>
          ))}

          {sec.note && (
            <div className="mt-4 rounded-xl border border-[#e2e4f0] bg-[#f7f8fc] px-4 py-3">
              <div
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                {sec.note.title}
              </div>
              <ArticleBlocks blocks={sec.note.body} accent={accent} variant="note" />
            </div>
          )}

          {sec.postNote && <ArticleBlocks blocks={sec.postNote} accent={accent} variant="body" />}

          {sec.footer && (
            <p className="mt-3 text-base leading-relaxed text-[#3a3a52]">{sec.footer}</p>
          )}
        </div>
      ))}

      {article.source && (
        <p className="mt-6 text-xs italic text-[#9a9ab5]">{article.source}</p>
      )}
    </section>
  )
}

// Normalize a YouTube reference (full URL, share URL, or bare 11-char id) into
// a privacy-friendly embed URL. Returns the input unchanged if already an embed.
function youtubeEmbedUrl(ref) {
  if (!ref) return ''
  if (ref.includes('/embed/')) return ref
  let id = ref
  const watch = ref.match(/[?&]v=([^&]+)/)
  const short = ref.match(/youtu\.be\/([^?&/]+)/)
  if (watch) id = watch[1]
  else if (short) id = short[1]
  return `https://www.youtube-nocookie.com/embed/${id}`
}

// Renders an ordered list of content blocks: a string is a paragraph, { image }
// is a figure, { list } is a bullet list. Keeps images next to the paragraph
// that describes them. `variant` switches between body and boxed-note styling.
function ArticleBlocks({ blocks, accent, variant = 'body' }) {
  const isNote = variant === 'note'
  const pClass = isNote
    ? 'mt-2 text-sm leading-relaxed text-[#4a4a63]'
    : 'mt-3 text-base leading-relaxed text-[#3a3a52]'
  const liClass = isNote
    ? 'flex gap-2 text-sm leading-relaxed text-[#4a4a63]'
    : 'flex gap-2 text-base leading-relaxed text-[#4a4a63]'

  return (
    <>
      {blocks?.map((block, i) => {
        if (typeof block === 'string') {
          return (
            <p key={i} className={pClass}>
              {block}
            </p>
          )
        }
        if (block.image) {
          return <ArticleImage key={i} image={block.image} />
        }
        if (block.list) {
          return (
            <ul key={i} className="mt-2 flex flex-col gap-1.5">
              {block.list.map((item, j) => (
                <li key={j} className={liClass}>
                  <span className="mt-[3px] shrink-0 font-bold" style={{ color: accent }}>
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )
        }
        return null
      })}
    </>
  )
}

// A single tutorial image, capped at ~1/3 of the content width. Plain <img>
// keeps it self-contained for the offline and presentation exports (no
// next/image dimension requirements).
function ArticleImage({ image }) {
  return (
    <img
      src={image.src}
      alt={image.alt || ''}
      loading="lazy"
      className="my-6 w-full max-w-[33%] rounded-xl border border-[#e2e4f0]"
    />
  )
}
