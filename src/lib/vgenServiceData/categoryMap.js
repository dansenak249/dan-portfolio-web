// Shared shape rules for a category map row.
// ------------------------------------------
// Commission and Shop keep SEPARATE maps, because VGen keeps separate
// taxonomies for them — 12 catalogues / 160 categories against 15 / 153, with
// only a partial overlap of ids. What they do share is the row shape, so the
// editor, the crawl and the rotation can handle a row from either without
// caring which table it came from.
//
// Sanitising lives here rather than in each route so the two cannot drift. An
// earlier version of this project had the same rule written out three times and
// they had already diverged by the time anyone noticed.

// Upper bound so a bad or abusive POST cannot store an unbounded list.
export const MAX_CATEGORIES = 500

// A text colour is a `#RRGGBB` hex (case-insensitive). Anything else -> ''.
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function sanitizeColor(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : ''
}

/**
 * Normalise and validate a posted map: keep only entries with a categoryID,
 * trim strings, de-duplicate by categoryID (first wins), cap the length.
 * `categoryName` and `color` MAY be empty.
 *
 * @param {unknown} input
 * @returns {null | { categoryID: string, categoryName: string, color: string,
 *   defaultName: string, auto: boolean }[]} null when the input is not an array
 */
export function sanitizeCategories(input) {
  if (!Array.isArray(input)) return null
  const out = []
  const seen = new Set()
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const categoryID =
      typeof raw.categoryID === 'string' ? raw.categoryID.trim() : ''
    const categoryName =
      typeof raw.categoryName === 'string' ? raw.categoryName.trim() : ''
    const color = sanitizeColor(raw.color)
    // VGen's own name for the category, captured at discovery. It is never
    // shown in place of `categoryName`; it is the PLACEHOLDER behind an empty
    // one, so clearing a rename falls back to the original instead of leaving a
    // blank row.
    const defaultName =
      typeof raw.defaultName === 'string' ? raw.defaultName.trim() : ''
    // Whether the automatic rotation refreshes this category. Off by default:
    // a category joins the rotation only when it is ticked.
    const auto = raw.auto === true || raw.auto === 'true' || raw.auto === 1
    if (!categoryID) continue
    if (seen.has(categoryID)) continue
    seen.add(categoryID)
    out.push({ categoryID, categoryName, color, defaultName, auto })
    if (out.length >= MAX_CATEGORIES) break
  }
  return out
}
