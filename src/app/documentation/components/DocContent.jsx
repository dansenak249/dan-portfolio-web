'use client'

import { docBreadcrumb } from '../data/docs'
import { findStage } from '../lib/pipelineUtils'
import { findTechDef, findFileExtension, findApplication, findCategoryIntro } from '../data/references'
import PipelineOverview from './PipelineOverview'
import ReferencesIntro from './ReferencesIntro'
import CategoryIntro from './CategoryIntro'
import StageDoc from './StageDoc'
import FileDoc from './FileDoc'
import TechDefDoc from './TechDefDoc'
import AppDoc from './AppDoc'

// Right-hand scrollable content pane. Resolves the active id to a page: the two
// group overviews, a pipeline stage, or one of the three reference page kinds.
export default function DocContent({ contentRef, tab, activeId, onSelect }) {
  if (tab === 'api') {
    return (
      <main ref={contentRef} className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
          <h1 className="text-xl font-bold text-[#2d2d3a]">API Reference</h1>
          <p className="mt-2 max-w-md text-sm text-[#6b6b8a]">
            No API data yet. The hierarchy is intentionally empty for now.
          </p>
        </div>
      </main>
    )
  }

  const crumbs = docBreadcrumb(activeId)

  return (
    <main ref={contentRef} className="flex-1 overflow-y-auto bg-white">
      <div className="px-16 py-8 sm:pl-24 sm:pr-24">
        <Breadcrumb crumbs={crumbs} />
        <PageBody activeId={activeId} onSelect={onSelect} />
        {/* Blank footer: a thin separator inset from both ends so the page does
            not cut off abruptly (mirrors the rule under the masthead). */}
        <footer className="mt-16">
          <div className="mx-8 border-t border-[#e2e4f0]" />
          <div className="h-16" />
        </footer>
      </div>
    </main>
  )
}

function PageBody({ activeId, onSelect }) {
  if (activeId === 'vtuber-pipeline') return <PipelineOverview onSelect={onSelect} />
  if (activeId === 'references') return <ReferencesIntro onSelect={onSelect} />

  const category = findCategoryIntro(activeId)
  if (category) return <CategoryIntro category={category} onSelect={onSelect} />

  const stage = findStage(activeId)
  if (stage) return <StageDoc stage={stage} onSelect={onSelect} />

  const techDef = findTechDef(activeId)
  if (techDef) return <TechDefDoc techDef={techDef} onSelect={onSelect} />

  const fileType = findFileExtension(activeId)
  if (fileType) return <FileDoc fileType={fileType} onSelect={onSelect} />

  const app = findApplication(activeId)
  if (app) return <AppDoc app={app} onSelect={onSelect} />

  return <p className="text-sm text-[#6b6b8a]">Page not found.</p>
}

function Breadcrumb({ crumbs }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-[#9a9ab5]">
        {crumbs.map((c, i) => (
          <li key={c} className="flex items-center gap-1">
            {i > 0 && <span className="text-[#c4c4dd]">›</span>}
            <span className={i === crumbs.length - 1 ? 'font-semibold text-[#5b5b7a]' : ''}>{c}</span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
