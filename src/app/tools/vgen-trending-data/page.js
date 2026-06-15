export const metadata = {
  title: 'VGen Trending Data',
  description:
    'Personal research dashboard tracking VGen trending searchIndex over time.',
  robots: { index: false, follow: false },
}

// The dashboard itself is a self-contained vanilla-JS/SVG document served from
// /public/tools/vgen-trending-data.html. It is embedded here in a full-viewport
// iframe so the proven imperative dashboard runs in full isolation (no React
// rewrite, no style bleed) while still living under the site's /tools route.
export default function VGenTrendingDataPage() {
  return (
    <iframe
      src="/tools/vgen-trending-data.html"
      title="VGen Trending Data"
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
