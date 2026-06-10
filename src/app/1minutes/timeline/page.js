import TimelineShell from './components/TimelineShell'

export const metadata = {
  title: '1 Minutes — Commissions Timeline',
  description: 'Team commission timeline & milestone tracker.',
  robots: { index: false, follow: false },
}

export default function TimelinePage() {
  return <TimelineShell />
}
