import { Roboto } from 'next/font/google'

// Scope Roboto to the VTuber pipeline docs only. The rest of the site keeps
// UTM Aptima (set on <body> in the root layout); this wrapper overrides the
// font-family for everything rendered inside the documentation route.
const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export default function VtuberPipelineDocsLayout({ children }) {
  return <div className={roboto.className}>{children}</div>
}
