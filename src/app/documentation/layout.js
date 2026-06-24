import { Roboto } from 'next/font/google'

// Scope Roboto to the VTuber pipeline docs only. The rest of the site keeps
// UTM Aptima (set on <body> in the root layout); this wrapper overrides the
// font-family for everything rendered inside the documentation route.
const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

// The documentation section is for internal use only — keep it (and everything
// nested under it) out of search engines entirely.
export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function VtuberPipelineDocsLayout({ children }) {
  return <div className={roboto.className}>{children}</div>
}
