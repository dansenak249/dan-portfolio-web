// Small inline SVG file-type icon for handoff popovers.
// Drawn from scratch (no copyrighted assets), colored per type.
const COLOR = {
  psd: '#31a8ff',
  model: '#7978e6',
  image: '#0f9d76',
  json: '#c2772b',
  feed: '#d6256f',
  stream: '#9146ff',
  generic: '#6b6b8a',
}

export default function FileIcon({ type = 'generic', size = 16 }) {
  const c = COLOR[type] || COLOR.generic

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* page base with folded corner */}
      <path
        d="M6 2.5h7l5 5V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V3a.5.5 0 0 1 0-.5Z"
        fill="white"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13 2.5V7.5h5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <Glyph type={type} c={c} />
    </svg>
  )
}

function Glyph({ type, c }) {
  switch (type) {
    case 'psd':
      return (
        <text x="12" y="18" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={c}>
          Ps
        </text>
      )
    case 'json':
      return (
        <text x="12" y="18" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={c}>
          {'{ }'}
        </text>
      )
    case 'image':
      return (
        <g fill={c}>
          <circle cx="10" cy="13" r="1.4" />
          <path d="M7.5 19l3-3.2 2 2.2 2.5-3 2 4z" />
        </g>
      )
    case 'model':
      return (
        <g stroke={c} strokeWidth="1.2" fill="none" strokeLinejoin="round">
          <path d="M12 11.5l3 1.6v3.3l-3 1.6-3-1.6v-3.3z" />
          <path d="M9 13.1l3 1.6 3-1.6M12 14.7v3.3" />
        </g>
      )
    case 'feed':
      return <path d="M10 13l5 3-5 3z" fill={c} />
    case 'stream':
      return (
        <g stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round">
          <circle cx="12" cy="16" r="1.3" fill={c} stroke="none" />
          <path d="M9.6 13.6a3.4 3.4 0 0 1 4.8 0M8 12a5.7 5.7 0 0 1 8 0" />
        </g>
      )
    default:
      return (
        <g stroke={c} strokeWidth="1.3" strokeLinecap="round">
          <path d="M9 13h6M9 16h6M9 19h3.5" />
        </g>
      )
  }
}
