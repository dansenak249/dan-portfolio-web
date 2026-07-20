export const metadata = {
  title: 'VGen Service Data',
  description:
    'Personal competitor-analysis dashboard tracking VGen client flow via public service reviews.',
  robots: { index: false, follow: false },
}

// The dashboard itself is a self-contained vanilla-JS/SVG document served from
// /public/tools/vgen-service-data.html. It is embedded here in a full-viewport
// iframe so the imperative dashboard runs in full isolation (no React rewrite,
// no style bleed) while still living under the site's /tools route.
export default function VGenServiceDataPage() {
  return (
    <iframe
      src="/tools/vgen-service-data.html"
      title="VGen Service Data"
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
