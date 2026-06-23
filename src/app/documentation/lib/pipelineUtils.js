import { pipeline } from '../data/pipeline'

// Find a stage by its id. Returns null when not found.
export function findStage(id) {
  return pipeline.find((stage) => stage.id === id) || null
}

// Resolve a list of stage ids into shallow { id, label, sub } chips.
export function resolveStages(ids = []) {
  return ids
    .map((id) => findStage(id))
    .filter(Boolean)
    .map((s) => ({ id: s.id, label: s.label, sub: s.sub, accent: s.accent, rep: s.rep }))
}

// Tag -> display color mapping, kept here so the map, stage pages and reference
// pages all agree.
export const TAG_STYLES = {
  standard: { bg: '#ffe3f1', fg: '#c2185b', text: 'Standard' },
  popular: { bg: '#ede9ff', fg: '#5b4bd6', text: 'Popular' },
  official: { bg: '#e3f0ff', fg: '#1565c0', text: 'Official' },
  free: { bg: '#e2f7ef', fg: '#0f9d76', text: 'Free' },
  paid: { bg: '#fff1e0', fg: '#c2772b', text: 'Paid' },
  ipad: { bg: '#f0eaff', fg: '#6b4bd6', text: 'iPad' },
  alt: { bg: '#eceef5', fg: '#5b5b7a', text: 'Alt' },
  enhancer: { bg: '#ffe0ec', fg: '#d6256f', text: 'Enhancer' },
  source: { bg: '#e7eeff', fg: '#3a5bd6', text: 'Input' },
  public: { bg: '#ffe3f1', fg: '#c2185b', text: 'Public' },
  regional: { bg: '#e3f0ff', fg: '#1565c0', text: 'Regional' },
  community: { bg: '#eceef5', fg: '#5b5b7a', text: 'Community' },
  automation: { bg: '#ede9ff', fg: '#5b4bd6', text: 'Automation' },
}

export function tagStyle(tag) {
  return TAG_STYLES[tag] || { bg: '#eceef5', fg: '#5b5b7a', text: tag || '' }
}
