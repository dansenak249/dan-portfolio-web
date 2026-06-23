'use client'

// Shared page heading: an optional logo/icon sits to the left of the title
// block. When no icon is rendered (the icon prop is omitted or resolves to
// null), the title block collapses flush-left so there is no empty placeholder.
export default function DocHeading({ icon = null, children }) {
  return (
    <div className="flex items-center gap-4">
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
