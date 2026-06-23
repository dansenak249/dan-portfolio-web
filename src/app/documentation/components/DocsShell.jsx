'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import { manualTree, apiTree, MANUAL_TITLE, API_TITLE, DEFAULT_PAGE_ID, collectPageIds } from '../data/docs'
import DocsHeader from './DocsHeader'
import DocsSubBar from './DocsSubBar'
import DocsSidebar from './DocsSidebar'
import DocContent from './DocContent'

const VALID_IDS = collectPageIds(manualTree)

// Top-level docs shell. Owns the active tab (manual/api), the selected page,
// and the language. Pinned masthead + sub-bar + sidebar; only content scrolls.
export default function DocsShell() {
  const [tab, setTab] = useState('manual')
  const [activeId, setActiveId] = useState(DEFAULT_PAGE_ID)
  const [lang, setLang] = useState('en')
  const [ready, setReady] = useState(false)
  const contentRef = useRef(null)

  // Hold the loading overlay until the scoped Roboto webfont is ready so the
  // page never flashes the fallback font. A timeout guarantees we never hang.
  useEffect(() => {
    let done = false
    const reveal = () => {
      if (!done) {
        done = true
        setReady(true)
      }
    }
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(reveal)
    }
    const t = setTimeout(reveal, 1500)
    return () => clearTimeout(t)
  }, [])

  const tree = tab === 'manual' ? manualTree : apiTree
  const title = tab === 'manual' ? MANUAL_TITLE : API_TITLE

  const select = useCallback((id) => {
    setActiveId(id)
    if (contentRef.current) contentRef.current.scrollTop = 0
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  // Honor an incoming #hash on first load.
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash && VALID_IDS.has(hash)) setActiveId(hash)
  }, [])

  if (!ready) return <LoadingScreen />

  return (
    <div className="flex h-screen flex-col bg-white">
      <DocsHeader tab={tab} onTab={setTab} />
      <DocsSubBar lang={lang} onLang={setLang} />

      <div className="flex min-h-0 flex-1">
        <DocsSidebar tree={tree} title={title} activeId={activeId} onSelect={select} />
        <DocContent contentRef={contentRef} tab={tab} activeId={activeId} onSelect={select} />
      </div>
    </div>
  )
}
