import BotConfigForm from './BotConfigForm'

export const metadata = {
  title: 'Bot Config',
  // Keep this owner-only utility page out of search indexes.
  robots: { index: false, follow: false },
}

// Server entry for the Discord bot config page. All interactivity lives in
// the client form; this wrapper just provides the page chrome.
export default function BotConfigPage() {
  return (
    <main className="min-h-screen bg-[#f4f6fc] px-4 py-10 flex justify-center">
      <div className="w-full max-w-4xl">
        <header className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#5b8de8] mb-1">
            Discord Bot
          </div>
          <h1 className="text-2xl font-bold text-[#2d2d3a] leading-tight">
            Runtime Config
          </h1>
          <p className="text-sm text-[#6b6b8a] mt-2">
            Update values the bot polls at runtime — chiefly the VGen session
            cookie, which expires roughly monthly. Paste a fresh cookie here and
            the bot picks it up on its next poll; no redeploy needed.
          </p>
        </header>
        <BotConfigForm />
      </div>
    </main>
  )
}
