// VGen export endpoint (streamed full dump)
// -----------------------------------------
// Downloads the ENTIRE dataset as one JSON file WITHOUT ever holding it all in
// memory on the server or the browser. The server reads Redis in small batches
// (<10 MB each, via iterateSnapshots) and streams the JSON out chunk by chunk;
// the browser saves it straight to disk (Content-Disposition: attachment) so it
// never has to load the whole thing into a JS variable. This is why a full
// export does NOT hit the old 10 MB request limit or the browser memory wall.
//   GET /api/vgen-trending/export -> attachment vgen-data-<ts>.json
// Shape: { exported_at, trending:[...], profiles:[...], threshold:[...] }
// Public read-only.

import { iterateSnapshots, listThreshold } from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const push = (s) => controller.enqueue(encoder.encode(s))
      // Stream each kind's rows as a JSON array, tracking commas across batches
      // so the result is one valid JSON document.
      const streamKind = async (kind) => {
        let first = true
        for await (const { rows } of iterateSnapshots(kind)) {
          for (const row of rows) {
            push((first ? '' : ',') + JSON.stringify(row))
            first = false
          }
        }
      }

      try {
        push('{"exported_at":' + JSON.stringify(new Date().toISOString()))
        push(',"trending":[')
        await streamKind('trending')
        push('],"profiles":[')
        await streamKind('profiles')
        push('],"threshold":')
        push(JSON.stringify(await listThreshold()))
        push('}')
      } catch (error) {
        // Abort the download so a truncated/invalid file is not silently saved.
        controller.error(error)
        return
      }
      controller.close()
    },
  })

  const filename = `vgen-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
