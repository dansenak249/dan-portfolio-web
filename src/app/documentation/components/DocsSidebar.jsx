'use client'

import { useState, useEffect, useRef } from 'react'

// Pinned left sidebar tree (Unity-style). Top-level groups are BOTH a page of
// their own and an expandable container: clicking the label opens the group's
// overview page, while the +/- box toggles its children. Groups may contain
// sub-categories (subgroups), which are expandable headers only. Leaves select
// a content page.
export default function DocsSidebar({ tree, title, activeId, onSelect }) {
  const [open, setOpen] = useState(() => initOpen(tree))
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))
  const asideRef = useRef(null)

  // Auto-expand the ancestors of the active page (e.g. on reload via #hash) so
  // the selected item is always visible. Only opens; never collapses what the
  // user already opened.
  useEffect(() => {
    const ancestors = ancestorIds(tree, activeId)
    if (ancestors.length === 0) return
    setOpen((o) => {
      const next = { ...o }
      let changed = false
      for (const id of ancestors) {
        if (!next[id]) {
          next[id] = true
          changed = true
        }
      }
      return changed ? next : o
    })
  }, [tree, activeId])

  // Scroll the active item into view when it changes or after its ancestors
  // expand. Deep pages can sit below the fold, so bring them on-screen.
  // requestAnimationFrame waits for the expand to render before measuring.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      asideRef.current
        ?.querySelector('[aria-current="page"]')
        ?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(raf)
  }, [activeId, open])

  return (
    <aside
      ref={asideRef}
      className="hidden w-72 shrink-0 overflow-y-auto border-r border-[#e2e4f0] bg-[#fafafe] md:block"
    >
      <div className="border-b border-[#e2e4f0] px-4 py-4">
        <h2 className="text-xl font-bold text-[#2d2d3a]">{title}</h2>
      </div>

      {tree.length === 0 ? (
        <p className="px-4 py-4 text-xs italic text-[#9a9ab5]">No pages yet.</p>
      ) : (
        <nav className="py-2">
          <ul>
            {tree.map((group) => (
              <li key={group.id} className="px-2">
                <div className="flex items-center gap-1">
                  <ExpandButton open={open[group.id]} onClick={() => toggle(group.id)} />
                  <button
                    type="button"
                    onClick={() => {
                      if (group.page) onSelect(group.id)
                      if (!open[group.id]) toggle(group.id)
                    }}
                    aria-current={group.id === activeId ? 'page' : undefined}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      group.id === activeId
                        ? 'font-bold text-black underline'
                        : 'text-[#2d2d3a] hover:underline'
                    }`}
                  >
                    {group.label}
                  </button>
                </div>

                {open[group.id] && group.children?.length > 0 && (
                  <ul className="mb-1 ml-3 border-l border-[#e2e4f0] pl-2">
                    {group.children.map((child) =>
                      child.type === 'subgroup' ? (
                        <SubGroup
                          key={child.id}
                          node={child}
                          open={open}
                          toggle={toggle}
                          activeId={activeId}
                          onSelect={onSelect}
                        />
                      ) : (
                        <Leaf
                          key={child.id}
                          leaf={child}
                          active={child.id === activeId}
                          onSelect={onSelect}
                        />
                      )
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  )
}

// A second-level (or deeper) category. It is both a page (its own intro article)
// and an expandable container: clicking the label opens the page and expands it,
// while the +/- box toggles its children. Renders recursively so a subgroup may
// itself contain subgroups (e.g. the Live2D Cubism app nesting its tutorials).
function SubGroup({ node, open, toggle, activeId, onSelect }) {
  const active = node.id === activeId
  const isOpen = Boolean(open[node.id])
  return (
    <li>
      <div className="flex items-center gap-1">
        <ExpandButton open={isOpen} onClick={() => toggle(node.id)} />
        <button
          type="button"
          onClick={() => {
            onSelect(node.id)
            if (!isOpen) toggle(node.id)
          }}
          aria-current={active ? 'page' : undefined}
          className={`flex-1 rounded-md px-1.5 py-1.5 text-left text-[13px] transition-colors ${
            active ? 'font-bold text-black underline' : 'text-[#3a3a52] hover:underline'
          }`}
        >
          {node.label}
        </button>
      </div>

      {isOpen && node.children?.length > 0 && (
        <ul className="mb-1 ml-3 border-l border-[#e2e4f0] pl-2">
          {node.children.map((child) =>
            child.type === 'subgroup' ? (
              <SubGroup
                key={child.id}
                node={child}
                open={open}
                toggle={toggle}
                activeId={activeId}
                onSelect={onSelect}
              />
            ) : (
              <Leaf key={child.id} leaf={child} active={child.id === activeId} onSelect={onSelect} />
            )
          )}
        </ul>
      )}
    </li>
  )
}

function Leaf({ leaf, active, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(leaf.id)}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
          active ? 'font-bold text-black underline' : 'text-[#5b5b7a] hover:underline'
        }`}
      >
        <span
          className={`mr-2 h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-[#1f9d76]' : 'bg-[#3ec4a0]'}`}
        />
        {leaf.label}
      </button>
    </li>
  )
}

// Filled square toggle (Unity-style) used standalone for top-level groups.
function ExpandButton({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Collapse' : 'Expand'}
      aria-expanded={open}
      className="shrink-0 rounded-sm"
    >
      <ExpandBox open={open} />
    </button>
  )
}

function ExpandBox({ open }) {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#3ec4a0] text-[12px] font-bold leading-none text-white"
      aria-hidden="true"
    >
      {open ? '\u2212' : '+'}
    </span>
  )
}

// Build the initial open-state map from defaultOpen across groups + subgroups.
function initOpen(tree) {
  const state = {}
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'group' || node.type === 'subgroup') {
        state[node.id] = Boolean(node.defaultOpen)
        if (node.children?.length) walk(node.children)
      }
    }
  }
  walk(tree)
  return state
}

// Collect the ids of every expandable container (group/subgroup) on the path to
// `id`, excluding `id` itself. Used to auto-expand the active page's ancestors.
function ancestorIds(tree, id) {
  const path = []
  const search = (nodes, trail) => {
    for (const node of nodes) {
      const isContainer = node.type === 'group' || node.type === 'subgroup'
      const nextTrail = isContainer ? [...trail, node.id] : trail
      if (node.id === id) {
        path.push(...trail)
        return true
      }
      if (node.children?.length && search(node.children, nextTrail)) return true
    }
    return false
  }
  search(tree, [])
  return path
}
