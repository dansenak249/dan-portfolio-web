'use client'

import { useState } from 'react'

// Pinned left sidebar tree (Unity-style). Top-level groups are BOTH a page of
// their own and an expandable container: clicking the label opens the group's
// overview page, while the +/- box toggles its children. Groups may contain
// sub-categories (subgroups), which are expandable headers only. Leaves select
// a content page.
export default function DocsSidebar({ tree, title, activeId, onSelect }) {
  const [open, setOpen] = useState(() => initOpen(tree))
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-[#e2e4f0] bg-[#fafafe] md:block">
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
                          open={open[child.id]}
                          onToggle={() => toggle(child.id)}
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

// A second-level category. It is both a page (its own intro article) and an
// expandable container: clicking the label opens the page and expands it, while
// the +/- box toggles its children.
function SubGroup({ node, open, onToggle, activeId, onSelect }) {
  const active = node.id === activeId
  return (
    <li>
      <div className="flex items-center gap-1">
        <ExpandButton open={open} onClick={onToggle} />
        <button
          type="button"
          onClick={() => {
            onSelect(node.id)
            if (!open) onToggle()
          }}
          aria-current={active ? 'page' : undefined}
          className={`flex-1 rounded-md px-1.5 py-1.5 text-left text-[13px] transition-colors ${
            active ? 'font-bold text-black underline' : 'text-[#3a3a52] hover:underline'
          }`}
        >
          {node.label}
        </button>
      </div>

      {open && node.children?.length > 0 && (
        <ul className="mb-1 ml-3 border-l border-[#e2e4f0] pl-2">
          {node.children.map((leaf) => (
            <Leaf key={leaf.id} leaf={leaf} active={leaf.id === activeId} onSelect={onSelect} />
          ))}
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
