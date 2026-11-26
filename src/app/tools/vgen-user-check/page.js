export const metadata = {
  title: 'VGen Account Check',
  description:
    'Quick public-footprint check of a VGen account before taking a commission.',
  robots: { index: false, follow: false },
}

// The checker is a self-contained vanilla-JS document served from
// /public/tools/vgen-user-check.html. It is embedded here in a full-viewport
// iframe so the imperative page runs in full isolation (no React rewrite, no
// style bleed) while still living under the site's /tools route. This mirrors
// the vgen-rush-fee / vgen-service-data tools.
export default function VGenUserCheckPage() {
  return (
    <iframe
      src="/tools/vgen-user-check.html"
      title="VGen Account Check"
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
