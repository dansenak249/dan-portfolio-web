// VGen category taxonomy discovery (server-side, unauthenticated, read-only)
// ---------------------------------------------------------------------------
// VGen exposes NO endpoint that lists its categories, and the front end never
// carries the opaque ids either — it navigates purely by slug. The mapping is
// still recoverable, in two steps:
//
//   1. https://vgen.co/sitemap.xml lists sitemap-searchCategories-1.xml, which
//      holds every category URL (base categories plus their facet variants).
//   2. Each /category/<slug> page embeds its services, and every one of them
//      carries `searchCategoryID`. The page is already filtered to that
//      category, so those ids are uniform — measured across 158 categories:
//      not one page returned more than a single distinct id, and no id appeared
//      under two different slugs.
//
// Verified against a hand-built map of 17 categories: 17/17 identical.
//
// A category page with no services yet yields no id (2 of 160 at the time of
// writing). Those are reported with a null categoryID rather than guessed at.
//
// Cloudflare 403s requests without a browser-like User-Agent, so one is sent.

const SITEMAP_URL = 'https://vgen.co/sitemap-searchCategories-1.xml'
const CATEGORY_BASE = 'https://vgen.co/category/'
const REQUEST_TIMEOUT_MS = 30000

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

/**
 * Every BASE category slug, in sitemap order.
 * Facet URLs (/category/<slug>/<facet>/<option>) are skipped: they filter a
 * category rather than being one, and they resolve to the same id.
 * @returns {Promise<string[]>}
 */
export async function fetchCategorySlugs() {
  const xml = await fetchText(SITEMAP_URL)
  const slugs = []
  const seen = new Set()
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g
  let match
  while ((match = re.exec(xml)) !== null) {
    const url = match[1]
    if (!url.startsWith(CATEGORY_BASE)) continue
    const path = url.slice(CATEGORY_BASE.length).replace(/\/+$/, '')
    if (!path || path.includes('/')) continue // facet variant, not a base category
    if (seen.has(path)) continue
    seen.add(path)
    slugs.push(path)
  }
  return slugs
}

// "Background Commissions | VGen" -> "Background". This is the SEO title, which
// does not always match the label VGen shows in its own UI, so it is only a
// fallback for fetchCategoryNames() below.
function titleFromPage(html) {
  const og = html.match(/property="og:title"\s+content="([^"]*)"/i)
  const raw = og ? og[1] : ''
  return raw.replace(/\s*Commissions\s*\|\s*VGen\s*$/i, '').trim()
}

// The twelve catalogue landing pages, which between them link to every base
// category. Each link carries the exact label VGen renders in its own UI:
//   <a href="/category/<slug>"><button ...><span class="text">Label</span>
// That is the only place the real names appear — the category page itself has
// no heading in its HTML, and the slug cannot represent the punctuation the
// labels use ("TikTok / Shorts / Reels Editing", "Trailers + Teasers").
const CATALOGUES = [
  'illustrations',
  '2d-avatars',
  '3d-models',
  'emotes-badges',
  'stream-assets',
  'branding-graphics',
  'animation-videos',
  'music-audio',
  'writing',
  'physical-goods',
  'advice',
  'misc',
]

const CATEGORY_LINK_RE =
  /<a href="\/category\/([a-z0-9-]+)"><button[^>]*>.*?<span class="text">([^<]*)<\/span>/g

/**
 * slug -> { name, catalogue } for every base category, read from the catalogue
 * pages. Measured coverage: 160 of 160 slugs, none missing.
 *
 * The catalogue is kept because VGen's labels are group-relative: under "Custom
 * Video Creation" a category is simply "Music Videos", which is ambiguous on its
 * own. Knowing which catalogue it came from restores that context.
 *
 * @returns {Promise<Record<string, { name: string, catalogue: string }>>}
 */
export async function fetchCategoryNames() {
  const out = {}
  for (const catalogue of CATALOGUES) {
    let html
    try {
      html = await fetchText('https://vgen.co/catalogue/' + catalogue)
    } catch {
      continue // one unreachable landing page should not lose the other eleven
    }
    CATEGORY_LINK_RE.lastIndex = 0
    let match
    while ((match = CATEGORY_LINK_RE.exec(html)) !== null) {
      const [, slug, name] = match
      if (!out[slug] && name.trim()) {
        out[slug] = { name: name.trim(), catalogue }
      }
    }
  }
  return out
}

// "custom-backgrounds" -> "Custom Backgrounds"
function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// The id shared by the page's services. Counting rather than taking the first
// keeps one odd row from renaming a whole category.
function dominantCategoryID(html) {
  const counts = new Map()
  const re = /"searchCategoryID":"(rec[A-Za-z0-9]+)"/g
  let match
  while ((match = re.exec(html)) !== null) {
    counts.set(match[1], (counts.get(match[1]) || 0) + 1)
  }
  let best = null
  let bestCount = 0
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id
      bestCount = count
    }
  }
  return { categoryID: best, distinct: counts.size, samples: bestCount }
}

/**
 * Resolve one slug to its category id and a suggested name.
 * @param {string} slug
 * @param {Record<string, { name: string, catalogue: string }>} [names]
 *   the map from fetchCategoryNames(); when present its label is authoritative
 */
export async function resolveCategorySlug(slug, names = {}) {
  const html = await fetchText(CATEGORY_BASE + encodeURIComponent(slug))
  const { categoryID, distinct, samples } = dominantCategoryID(html)
  const known = names[slug]
  return {
    slug,
    categoryID,
    // VGen's own UI label, when we have it. The other two are fallbacks.
    name: (known && known.name) || titleFromPage(html) || titleFromSlug(slug),
    catalogue: (known && known.catalogue) || '',
    nameFromPage: titleFromPage(html),
    nameFromSlug: titleFromSlug(slug),
    // distinct > 1 would mean the page mixed categories, which has not been
    // observed; surfaced so it cannot pass unnoticed if VGen ever changes.
    distinct,
    samples,
  }
}

/**
 * Resolve a SLICE of slugs, bounded by both count and wall clock so one call
 * fits a serverless budget. The caller advances `offset` until `done`.
 *
 * @param {string[]} slugs
 * @param {object} [options]
 * @param {number} [options.offset]
 * @param {number} [options.limit]
 * @param {number} [options.maxMs]
 * @param {number} [options.gapMs] pause between page fetches
 */
export async function resolveCategorySlice(slugs, options = {}) {
  const {
    offset = 0,
    limit = 20,
    maxMs = 25000,
    gapMs = 250,
    names = {},
  } = options
  const startedAt = Date.now()

  const results = []
  const errors = []
  let index = offset

  while (index < slugs.length && results.length + errors.length < limit) {
    if (Date.now() - startedAt > maxMs) break
    const slug = slugs[index]
    try {
      results.push(await resolveCategorySlug(slug, names))
    } catch (error) {
      // One unreachable page must not sink the batch; the caller can retry it.
      errors.push({
        slug,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    index++
    if (index < slugs.length) await new Promise((r) => setTimeout(r, gapMs))
  }

  return {
    results,
    errors,
    nextOffset: index,
    done: index >= slugs.length,
    total: slugs.length,
  }
}
