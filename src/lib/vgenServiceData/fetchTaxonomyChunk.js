// VGen taxonomy, read straight from its client bundle (read-only)
// -----------------------------------------------------------------
// VGen ships its whole category tree as one frozen literal inside a JS chunk:
//
//   Object.freeze({ catalogues: [{
//     catalogueID, label: "Illustrations", prefix: "Custom", slug,
//     sections: [{ sectionID, label: "New Custom Design",
//       categories: [{ categoryID, prefix: "Custom", label: "Backgrounds", slug,
//         options: [{ optionID, label: "Type",
//           variants: [{ variantID, label: "Interior" }] }] }] }] }] })
//
// One request gets the lot: 12 catalogues, 39 sections, 160 categories, 196
// options, 966 variants — against ~160 page fetches for the same table built
// from category pages one at a time.
//
// NOTHING here is stable by contract, so every step is defensive:
//   - chunk filenames are content-hashed and the buildId changes on every deploy
//     (observed changing within a day), so the chunk list is read from a live
//     page rather than remembered;
//   - chunks are served from assets.vgen.co, NOT vgen.co — fetching the wrong
//     host quietly returns a different, smaller bundle that lacks the taxonomy;
//   - the literal is validated as pure data before it is evaluated (see
//     looksLikeDataLiteral) because evaluating third-party code is not something
//     to do on trust.
//
// If any of that stops matching, the caller falls back to the per-page method in
// fetchCategoryTaxonomy.js, which is slower but depends only on rendered HTML.

// TWO trees, one chunk. VGen ships the Commission taxonomy and the Shop
// taxonomy as two separate frozen literals inside the SAME bundle, both under
// the key `catalogues`. They are different tables - 12 catalogues / 160
// categories for Commission, 15 / 153 for Shop, overlapping but far from equal -
// so which one you get depends entirely on which occurrence you read. Reading
// the first and assuming it covers Shop is wrong, and quietly so: the ids look
// identical in shape and 36 of them really are shared.
const PROBE_PAGE = 'https://vgen.co/category/custom-backgrounds'
const SHOP_PROBE_PAGE = 'https://vgen.co/shop/catalogue/emotes-badges'
const MARKER = 'catalogues:[{catalogueID:'

// Which literal to take, 1-based, in the order they appear in the chunk.
export const TAXONOMY_COMMISSION = 1
export const TAXONOMY_SHOP = 2
const REQUEST_TIMEOUT_MS = 30000
const MAX_CHUNKS = 120
const FETCH_BATCH = 8

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': BROWSER_UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url)
  return res.text()
}

// Script URLs the page actually loads, in order. Both hosts are accepted so a
// change of CDN does not break discovery outright.
function chunkUrls(html) {
  const urls = new Set()
  const re = /https:\/\/(?:assets\.vgen\.co|vgen\.co)\/[^"'\s]+?\.js/g
  let match
  while ((match = re.exec(html)) !== null) urls.add(match[0])
  return [...urls].slice(0, MAX_CHUNKS)
}

// Extract the balanced { ... } starting at `start`, ignoring braces and quotes
// that appear inside strings (labels contain both).
function sliceLiteral(src, start) {
  let depth = 0
  let inStr = false
  let quote = ''
  let esc = false
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === quote) inStr = false
      continue
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; quote = c; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  return null
}

// Guard before evaluating: strip every string body, then require what remains to
// be nothing but object/array punctuation, identifiers and numbers. A real data
// literal passes; anything with a call, arrow, template or `new` does not — so a
// chunk that ever stops being plain data is rejected instead of executed.
function looksLikeDataLiteral(literal) {
  let bare = ''
  let inStr = false
  let quote = ''
  let esc = false
  for (const c of literal) {
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === quote) inStr = false
      continue
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; quote = c; continue }
    bare += c
  }
  // `!0` / `!1` are the minifier's true / false, so `!` is allowed.
  return /^[\s{}[\]:,!0-9A-Za-z_$.+-]*$/.test(bare)
}

/**
 * Fetch and parse VGen's taxonomy literal.
 * @returns {Promise<{ catalogues: object[] }>}
 */
export async function fetchTaxonomy(options = {}) {
  const occurrence = Math.max(1, Number(options.occurrence) || TAXONOMY_COMMISSION)
  const probe = options.probePage ||
    (occurrence === TAXONOMY_SHOP ? SHOP_PROBE_PAGE : PROBE_PAGE)
  const html = await fetchText(probe)
  const urls = chunkUrls(html)
  if (!urls.length) throw new Error('No script chunks found on the probe page')

  for (let i = 0; i < urls.length; i += FETCH_BATCH) {
    const batch = urls.slice(i, i + FETCH_BATCH)
    const settled = await Promise.allSettled(batch.map((u) => fetchText(u)))
    for (const result of settled) {
      if (result.status !== 'fulfilled') continue
      const src = result.value
      // Walk to the requested occurrence rather than taking the first hit.
      let at = -1
      for (let n = 0; n < occurrence; n++) {
        at = src.indexOf(MARKER, at + 1)
        if (at < 0) break
      }
      if (at < 0) continue
      const literal = sliceLiteral(src, src.lastIndexOf('{', at))
      if (!literal) continue
      if (!looksLikeDataLiteral(literal)) {
        throw new Error('Taxonomy literal is no longer plain data; refusing to evaluate it')
      }
      const data = new Function('return ' + literal)()
      if (!data || !Array.isArray(data.catalogues)) continue
      return data
    }
  }
  throw new Error('Taxonomy literal not found in any chunk')
}

// VGen's header shows prefix + label ("Custom" + "Backgrounds"). When the prefix
// already starts with "Other" and so does the label, the site does not repeat
// it: prefix "Other Custom" + label "Other Video Creation" renders as
// "Other Custom Video Creation", which is what this reproduces.
function composeName(prefix, label) {
  const p = (prefix || '').trim()
  const l = (label || '').trim()
  if (!p) return l
  if (/^Other\b/i.test(p) && /^Other\s+/i.test(l)) {
    return p + ' ' + l.replace(/^Other\s+/i, '')
  }
  return p + ' ' + l
}

/**
 * Flatten the tree into one row per category.
 *
 * `name` is the header form VGen shows on the category page; `label` is the
 * shorter form its navigation and breadcrumb use. Both are real VGen strings —
 * they are simply used in different places, so both are returned.
 *
 * @param {{ catalogues: object[] }} data
 */
export function flattenTaxonomy(data) {
  const rows = []
  const seen = new Set()
  for (const cat of data.catalogues || []) {
    for (const sec of cat.sections || []) {
      // `additionalCategories` cross-lists a category under a second section.
      // Reading both and de-duplicating is what makes the Shop tree come out at
      // its true 153 rather than dropping the cross-listed ones; Commission is
      // unaffected, since every one of its extras is already in `categories`.
      for (const c of [...(sec.categories || []), ...(sec.additionalCategories || [])]) {
        if (!c || typeof c.categoryID !== 'string') continue
        if (seen.has(c.categoryID)) continue
        seen.add(c.categoryID)
        rows.push({
          categoryID: c.categoryID,
          slug: c.slug || '',
          label: c.label || '',
          prefix: c.prefix || '',
          name: composeName(c.prefix, c.label),
          section: sec.label || '',
          catalogue: cat.label || '',
          options: (c.options || []).map((o) => ({
            optionID: o.optionID,
            label: o.label || '',
            slug: o.slug || '',
            variants: (o.variants || []).map((v) => ({
              variantID: v.variantID,
              label: v.label || '',
              // The shape VGen's own filters use in searchCategoryVariantKeys.
              key: o.optionID + '_' + v.variantID,
            })),
          })),
        })
      }
    }
  }
  return rows
}
