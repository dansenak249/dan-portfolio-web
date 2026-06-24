// Documentation shell configuration: branding, the sidebar tree, languages.
// The tree is derived from data/pipeline.js and data/references.js so it stays
// in sync with the content automatically.
//
// Tree node shapes:
//   group    - top-level, expandable AND a page of its own (page: true)
//   subgroup - second level, expandable header only (not a page)
//   leaf     - a content page (the smallest selectable unit)

import { pipeline } from './pipeline'
import { sortedTechDefs, sortedFileExtensions, sortedApplications } from './references'
import { rigTutorialLinks } from './rigTutorials'

// Branding for the dark masthead. Set `logo` to an image path once available;
// when null, the title sits flush-left (no logo slot reserved).
export const BRAND = {
  name: '1 Minutes',
  suffix: 'Documentation',
  logo: null, // e.g. '/documentation/logo.png'
}

// Language options (UI only for now — localization comes later).
// `short` is the label shown inside the sliding EN/VN toggle.
export const LANGUAGES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'vi', label: 'Tiếng Việt', short: 'VN' },
]

export const MANUAL_TITLE = '1 Minutes Manual'
export const API_TITLE = '1 Minutes API'

// The page shown on first load (the Vtuber Pipeline group is its own overview).
export const DEFAULT_PAGE_ID = 'vtuber-pipeline'

// Manual sidebar tree. The first group doubles as the Overview page; References
// nests three sub-categories and also has its own intro page.
export const manualTree = [
  {
    id: 'vtuber-pipeline',
    label: 'Vtuber 2D Pipeline',
    type: 'group',
    page: true,
    defaultOpen: true,
    // Every pipeline stage is a plain leaf; the five Cubism Editor tutorials now
    // live under the Live2D Cubism application entry in References.
    children: pipeline.map((s) => ({ id: s.id, label: s.label })),
  },
  {
    id: 'references',
    label: 'References',
    type: 'group',
    page: true,
    defaultOpen: false,
    // Sub-categories are listed alphabetically: Applications & Plugins, then
    // File Extensions, then Technical Definition.
    children: [
      {
        id: 'apps',
        label: 'Applications & Plugins',
        type: 'subgroup',
        page: true,
        defaultOpen: true,
        // Live2D Cubism is itself expandable: it nests the five Cubism Editor
        // tutorials. Every other application is a plain leaf.
        children: sortedApplications().map((a) =>
          a.id === 'live2d-cubism'
            ? {
                id: a.id,
                label: a.name,
                type: 'subgroup',
                page: true,
                defaultOpen: false,
                children: rigTutorialLinks,
              }
            : { id: a.id, label: a.name }
        ),
      },
      {
        id: 'file-ext',
        label: 'File Extensions',
        type: 'subgroup',
        page: true,
        defaultOpen: false,
        children: sortedFileExtensions().map((f) => ({ id: f.id, label: f.navLabel })),
      },
      {
        id: 'tech-def',
        label: 'Technical Definition',
        type: 'subgroup',
        page: true,
        defaultOpen: false,
        children: sortedTechDefs().map((t) => ({ id: t.id, label: t.term })),
      },
    ],
  },
]

// API tree is intentionally empty (no data yet).
export const apiTree = []

// Walk the tree and collect every id that can be opened as a page: group pages
// plus all leaf pages (subgroups are headers, not pages).
export function collectPageIds(tree) {
  const ids = new Set()
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'group' && node.page) ids.add(node.id)
      if (node.type === 'subgroup') {
        if (node.page) ids.add(node.id)
        walk(node.children || [])
        continue
      }
      if (!node.type) ids.add(node.id) // leaf
      if (node.children?.length) walk(node.children)
    }
  }
  walk(tree)
  return ids
}

// Build the breadcrumb trail (array of labels) for a given page id by searching
// the manual tree. Always rooted at MANUAL_TITLE.
export function docBreadcrumb(id) {
  const path = []
  const search = (nodes, trail) => {
    for (const node of nodes) {
      const nextTrail = [...trail, node.label]
      if (node.id === id) {
        path.push(...nextTrail)
        return true
      }
      if (node.children?.length && search(node.children, nextTrail)) return true
    }
    return false
  }
  if (search(manualTree, [MANUAL_TITLE])) return path
  return [MANUAL_TITLE]
}

// Today's date as YYYY-MM-DD for the Change Log control.
export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
