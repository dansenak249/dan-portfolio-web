'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { VIETNAMESE_DISHES } from './dishes'
import LoadingScreen from '@/components/LoadingScreen'

const DEFAULT_TITLE = 'Hôm nay ăn gì?'

// 5 fps x 2s = 10 cycling frames, then swap to the final pick.
const ANIMATION_DURATION_MS = 2000
const ANIMATION_FPS = 5
const ANIMATION_FRAME_MS = 1000 / ANIMATION_FPS
const ANIMATION_FRAMES = ANIMATION_DURATION_MS / ANIMATION_FRAME_MS // 10

// Steady-state target size per region pool. Each click consumes one
// item as the final pick and uses the rest as the cycling reel. The
// FULL pool is then replaced with fresh prefetches so the next click
// never reuses an image from the current one.
const POOL_TARGET = 7

// How many recently-shown dishes per region to remember and exclude
// from refills. Combined with the discarded pool this guarantees the
// user won't see the same dish back for at least this many picks.
const RECENT_HISTORY_SIZE = 7

// Per-call attempt cap when a dish has no wiki image or TheMealDB hiccups.
const MAX_PREFETCH_ATTEMPTS = 5

const VI_WIKI_SUMMARY = (title) =>
  `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`

const MEALDB_RANDOM = 'https://www.themealdb.com/api/json/v1/1/random.php'

// Fetch the Wikipedia thumbnail URL for a dish title. Returns null if
// the page doesn't exist or has no image.
async function fetchViWikiImageUrl(title) {
  try {
    const res = await fetch(VI_WIKI_SUMMARY(title))
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail?.source ?? data.originalimage?.source ?? null
  } catch {
    return null
  }
}

// Fetch one random international meal from TheMealDB.
async function fetchRandomIntlRaw() {
  try {
    const res = await fetch(MEALDB_RANDOM)
    if (!res.ok) return null
    const data = await res.json()
    const meal = data.meals?.[0]
    if (!meal?.strMeal || !meal?.strMealThumb) return null
    // TheMealDB serves a smaller variant at /preview — perfect for a
    // 300x300 box and cuts download size roughly in half.
    return { name: meal.strMeal, image: `${meal.strMealThumb}/preview` }
  } catch {
    return null
  }
}

// Decode the image bytes into the browser cache by attaching it to a
// detached Image element. Resolves to the URL only after the bytes are
// fully ready so subsequent <img src={url}> renders are instant — this
// is the key trick that removes the animation flicker / lag.
function preloadImageBytes(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Fisher-Yates shuffle, immutable.
function shuffle(arr) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Build a cycling reel of length `n` that minimizes visible repeats:
//   - When pool >= n: shuffle and take n distinct items (no repeat).
//   - When pool < n: shuffle as base, then top up while avoiding
//     consecutive duplicates so the user never sees the same image
//     two frames in a row.
function buildCyclingReel(pool, n) {
  if (pool.length === 0) return []
  if (pool.length === 1) return Array(n).fill(pool[0])
  if (pool.length >= n) return shuffle(pool).slice(0, n)

  const out = shuffle(pool)
  while (out.length < n) {
    const last = out[out.length - 1]
    let next
    do {
      next = pool[Math.floor(Math.random() * pool.length)]
    } while (next === last)
    out.push(next)
  }
  return out
}

// Prefetch one VN dish: pick a random name, fetch its wiki image URL,
// then preload the image bytes. Retries with a different dish on null
// so a single missing-wiki-page entry doesn't poison a pool slot.
// `usedNames` is mutated to avoid duplicates inside a batch.
async function prefetchOneVn(usedNames) {
  for (let attempt = 0; attempt < MAX_PREFETCH_ATTEMPTS; attempt++) {
    const name = pickOne(VIETNAMESE_DISHES)
    if (usedNames.has(name)) continue
    const url = await fetchViWikiImageUrl(name)
    if (!url) continue
    const ready = await preloadImageBytes(url)
    if (!ready) continue
    usedNames.add(name)
    return { name, image: ready }
  }
  return null
}

// Prefetch one intl meal. Accepts a usedNames Set so callers can dedup
// against sibling prefetches and recently-shown finals.
async function prefetchOneIntl(usedNames) {
  for (let attempt = 0; attempt < MAX_PREFETCH_ATTEMPTS; attempt++) {
    const meal = await fetchRandomIntlRaw()
    if (!meal) continue
    if (usedNames.has(meal.name)) continue
    const ready = await preloadImageBytes(meal.image)
    if (!ready) continue
    usedNames.add(meal.name)
    return { name: meal.name, image: ready }
  }
  return null
}

export default function FoodPicker() {
  const [displayName, setDisplayName] = useState(DEFAULT_TITLE)
  const [displayImage, setDisplayImage] = useState(null)

  // Preloaded pools — every item in here already has its image bytes
  // sitting in the browser cache. Cycling reel for each click pulls
  // from the same region pool so VN clicks show a VN reel and intl
  // clicks show an intl reel (hybrid behavior).
  const [vnPool, setVnPool] = useState([])
  const [intlPool, setIntlPool] = useState([])

  const [isInitializing, setIsInitializing] = useState(true)
  const [isPicking, setIsPicking] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Ring buffers of recently-shown dish names per region. Refills
  // exclude these so the user won't see the same dish reappear within
  // RECENT_HISTORY_SIZE picks of the same region.
  const recentVnRef = useRef([])
  const recentIntlRef = useRef([])

  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Cleanup any in-flight timers on unmount.
  useEffect(() => stopAnimation, [stopAnimation])

  // Initial preload — runs once on mount. Loading screen covers the
  // page until both pools are fully populated in browser cache.
  useEffect(() => {
    let cancelled = false

    async function init() {
      // Per-batch Sets so the 7 initial VN dishes are distinct, and
      // the 7 initial intl meals are also distinct (MealDB random
      // can repeat across calls).
      const vnUsedNames = new Set()
      const intlUsedNames = new Set()

      const vnPromises = Array.from(
        { length: POOL_TARGET },
        () => prefetchOneVn(vnUsedNames)
      )
      const intlPromises = Array.from(
        { length: POOL_TARGET },
        () => prefetchOneIntl(intlUsedNames)
      )

      const [vn, intl] = await Promise.all([
        Promise.all(vnPromises),
        Promise.all(intlPromises),
      ])

      if (cancelled) return

      setVnPool(vn.filter(Boolean))
      setIntlPool(intl.filter(Boolean))
      setIsInitializing(false)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Push a name into the recent ring buffer (FIFO, capped at
  // RECENT_HISTORY_SIZE). Mutates the ref directly — recent history
  // is purely an exclusion source and doesn't drive rendering.
  const trackShown = (region, name) => {
    const ref = region === 'vn' ? recentVnRef : recentIntlRef
    const next = [...ref.current, name]
    ref.current = next.slice(-RECENT_HISTORY_SIZE)
  }

  // Replace the entire region pool with POOL_TARGET fresh items. Runs
  // in the background after a click; the previous pool was already
  // consumed for this click's animation, so wiping it forces the NEXT
  // click's cycling reel to show 100% new images.
  const refillFull = useCallback(async (region, excludeNames) => {
    if (region === 'vn') {
      const promises = Array.from(
        { length: POOL_TARGET },
        () => prefetchOneVn(excludeNames)
      )
      const items = await Promise.all(promises)
      setVnPool(items.filter(Boolean))
    } else {
      const promises = Array.from(
        { length: POOL_TARGET },
        () => prefetchOneIntl(excludeNames)
      )
      const items = await Promise.all(promises)
      setIntlPool(items.filter(Boolean))
    }
  }, [])

  const runAnimation = useCallback(
    ({ finalItem, cyclingItems }) => {
      let frame = 0
      intervalRef.current = setInterval(() => {
        const current = cyclingItems[frame % cyclingItems.length]
        setDisplayName(current.name)
        setDisplayImage(current.image)
        frame++
      }, ANIMATION_FRAME_MS)

      timeoutRef.current = setTimeout(() => {
        stopAnimation()
        setDisplayName(finalItem.name)
        setDisplayImage(finalItem.image)
        setIsPicking(false)
      }, ANIMATION_DURATION_MS)
    },
    [stopAnimation]
  )

  // Pick a final from the region pool, build the cycling reel from
  // the rest of that same pool (hybrid: VN reel for VN, intl reel for
  // intl), clear the pool, kick off the animation, and fire-and-forget
  // a full refill so the next click sees all-new images.
  const pickFromRegion = (region) => {
    const pool = region === 'vn' ? vnPool : intlPool
    const setPool = region === 'vn' ? setVnPool : setIntlPool
    if (isPicking || pool.length === 0) return
    setErrorMessage(null)
    setIsPicking(true)

    const [finalItem, ...rest] = pool

    // buildCyclingReel guarantees length === n when pool.length >= 1,
    // but rest can be empty if the pool was down to its last item;
    // fall back to the final item so setInterval never sees [].
    let cyclingItems = buildCyclingReel(rest, ANIMATION_FRAMES)
    if (cyclingItems.length === 0) cyclingItems = [finalItem]

    // Wipe the pool — the refill below will replace it with all-fresh
    // items. Button auto-disables (pool.length === 0) until refill done.
    setPool([])

    runAnimation({ finalItem, cyclingItems })

    // Track the final BEFORE building the exclude set so refill skips it.
    trackShown(region, finalItem.name)
    const recent = region === 'vn' ? recentVnRef.current : recentIntlRef.current
    // Exclude: recent history + names just shown in this reel (rest +
    // final). This guarantees zero visual overlap with the prior click.
    const excludeNames = new Set([
      finalItem.name,
      ...rest.map((item) => item.name),
      ...recent,
    ])

    refillFull(region, excludeNames).catch(() => {
      setErrorMessage('Lỗi khi tải thêm món. Cậu thử lại sau nhé!')
    })
  }

  const handlePickVn = () => pickFromRegion('vn')
  const handlePickIntl = () => pickFromRegion('intl')

  if (isInitializing) {
    return <LoadingScreen />
  }

  // Button is dimmed when its region pool is empty (refill in flight)
  // or while an animation is running. This is what guarantees there is
  // always an image ready to display the moment a click fires.
  const vnDisabled = isPicking || vnPool.length === 0
  const intlDisabled = isPicking || intlPool.length === 0

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center py-8 px-4 sm:px-6"
      style={{ backgroundColor: '#dadef0' }}
    >
      {/* Square white card that anchors the whole experience so it
          doesn't feel floating on the page bg. aspect-ratio keeps it
          a true square; width clamp keeps it from overshooting on
          tiny viewports. */}
      <div
        className="bg-white rounded-2xl flex flex-col items-center justify-center"
        style={{
          width: 'min(520px, 95vw)',
          aspectRatio: '1 / 1',
          padding: 'clamp(20px, 4vw, 40px)',
          boxShadow: '0 20px 60px rgba(75, 0, 130, 0.12)',
        }}
      >
        {/* Title — replaced by picked dish name after selection.
            minHeight prevents layout shift between 1- and 2-line names. */}
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide text-center text-[#2d2d3a] flex items-center justify-center"
          style={{ minHeight: '2.5em', maxWidth: '90%' }}
        >
          {displayName}
        </h1>

        {/* Image box — sized relative to the card. Inner shadow removed
            since the outer card now carries the elevation. Subtle
            light-gray bg keeps the empty/emoji state visible. */}
        <div
          className="relative rounded-lg overflow-hidden bg-[#f5f5f5] flex items-center justify-center mt-4"
          style={{
            width: 'min(280px, 60%)',
            aspectRatio: '1 / 1',
          }}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="text-6xl select-none"
              style={{ opacity: 0.4 }}
              aria-hidden="true"
            >
              🍽️
            </div>
          )}
        </div>

        {/* Action buttons — mt-10 (40px) = default gap-6 (24px) + 16px
            extra (1/3 of the 48px button height) per the spec. */}
        <div className="flex gap-3 items-center mt-10">
          <button
            type="button"
            onClick={handlePickVn}
            disabled={vnDisabled}
            className="h-12 px-6 rounded text-sm font-bold uppercase tracking-wider transition-colors text-white bg-[#ff69b4] hover:bg-[#ff4fa3] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ff69b4]"
          >
            Việt Nam
          </button>
          <button
            type="button"
            onClick={handlePickIntl}
            disabled={intlDisabled}
            className="h-12 px-6 rounded text-sm font-bold uppercase tracking-wider transition-colors text-white bg-[#5b8de8] hover:bg-[#4a78d6] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#5b8de8]"
          >
            Quốc Tế
          </button>
        </div>

        {errorMessage && (
          <p
            className="text-sm font-medium mt-3"
            style={{ color: '#d6336c' }}
          >
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
