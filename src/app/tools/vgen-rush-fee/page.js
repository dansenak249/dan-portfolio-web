export const metadata = {
  title: 'Rush Fee Calculator',
  description:
    'Rush deadline surcharge calculator for VGen commission pricing.',
  robots: { index: false, follow: false },
}

// The calculator is a self-contained vanilla-JS/SVG document served from
// /public/tools/vgen-rush-fee.html. It is embedded here in a full-viewport
// iframe so the imperative page runs in full isolation (no React rewrite, no
// style bleed) while still living under the site's /tools route. This mirrors
// the vgen-service-data / vgen-trending-data tools.
export default function VGenRushFeePage() {
  return (
    <iframe
      src="/tools/vgen-rush-fee.html"
      title="Rush Fee Calculator"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
      }}
    />
  )
}
