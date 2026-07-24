// VGen search -> service list harvester (DevTools console, read-only)
// ===================================================================
// Scans VGen search results into unique SERVICES and downloads a pretty-printed
// JSON text file of { count, serviceName, serviceID, type, categoryID, tags } so
// you can eyeball it and delete noise by hand before importing into the Service
// Data dashboard.
//
//   `count`      = how many scanned results pointed at that service (frequency).
//                  A relevance/noise signal: many hits = clearly on-topic; a
//                  one-off is more likely noise.
//   `type`       = VGen's declared service type (FULLY_CUSTOM / PERSONALIZED).
//   `categoryID` = VGen's official category id (searchCategoryID). It is an
//                  OPAQUE Airtable-style id (e.g. recJrGyjhKdztjqv1), not a human
//                  label — resolving it to readable text needs VGen's category
//                  taxonomy endpoint.
//   `tags`       = artist-set tags (note: tags[0] is usually just the search
//                  term, so a weak discriminator).
//
// REVIEW FILTER (CONFIG.minReviews, default 10): before download, both modes
// make ONE extra pass hitting each captured service's public reviews feed and
// DROP any service with fewer than `minReviews` reviews (junk / low-signal
// listings). Each kept row gains `reviewCount` (a lower bound once the
// threshold is met — see `reviewCountAtLeast`). Set CONFIG.minReviews = 0 to
// disable. Because this pass is async, in capture mode `vgenDump()` now returns
// a promise (just `await vgenDump()` or ignore it — the download still fires).
//
// TWO MODES (set CONFIG.mode):
//
//   'capture'  (default, lazy-load friendly, no endpoint guessing)
//     1. Log in to VGen. Open the Console.
//     2. Paste this file FIRST (before searching). It installs network hooks.
//        Installing BEFORE you search is what lets it catch the very first
//        batch — no "preserve log / reload" trick needed.
//     3. Do your search (e.g. type "animation"), then scroll to the bottom
//        repeatedly so VGen lazy-loads every page. Watch the console count.
//     4. When the count stops growing, run:  vgenDump()
//        -> a vgen-animation-services.txt download appears.
//        (vgenReset() clears the buffer; vgenStop() removes the hooks.)
//
//   'fetch'  (direct pagination — fastest, no scrolling, never misses a batch)
//     The results endpoint is a POST:  api.vgen.co/commission/services/search
//     The search term + cursor live in the request BODY (that's why "Copy link
//     address" only gives the bare URL). It is CURSOR-paged: the response carries
//     `nextCursor` and each service has a `serviceName`.
//     (`service-lists/services/exists` is NOT the results feed — it only checks
//      IDs and returns no names.)
//     1. DevTools -> Network, run your search, click the
//        `commission/services/search` request -> "Payload" tab -> copy the JSON.
//     2. Set below:  CONFIG.mode = 'fetch'  (CONFIG.maxResults is already 100).
//        CONFIG.body can stay null — the known default body is already wired
//        ({ textQuery, cursor:null, filters, sortType:"relevance" }). Only paste
//        a fresh Payload into CONFIG.body if VGen changes the search shape.
//     3. Paste this whole file into the Console. It walks the cursor itself and
//        downloads the file when done — no scrolling needed.
//
// READ-ONLY: only GET requests are made; nothing is posted.

(function vgenHarvester() {
  'use strict';

  // ---- CONFIG ----------------------------------------------------------------
  const CONFIG = {
    mode: 'capture', // 'capture' | 'fetch'
    term: 'animation', // used for the download filename (+ default body query)
    maxResults: 200, // stop after scanning this many result items
    // ---- 'fetch' mode only --------------------------------------------------
    // commission/services/search is a POST endpoint: the search term + cursor
    // live in the request BODY, not the URL. So:
    sampleUrl: 'https://api.vgen.co/commission/services/search',
    method: 'POST', // 'POST' | 'GET'
    // Paste the request Payload JSON here (Network -> the request -> Payload tab).
    // Leave null to use the known default body ({ textQuery, cursor, filters,
    // sortType }); only override if VGen changes the search payload shape.
    body: null,
    pageGapMs: 250, // pause between pages in fetch mode
    maxPages: 40, // hard page cap in fetch mode
    // ---- review-count filter (both modes) -----------------------------------
    // Drop low-signal services before download: keep only those whose public
    // review feed has at least `minReviews` reviews. Set to 0 to disable. The
    // search endpoint carries NO review count, so this makes ONE extra pass that
    // fetches each captured service's reviews feed (stopping as soon as the
    // threshold is met, so it's usually a single request per service).
    minReviews: 10,
    reviewConcurrency: 4, // parallel review lookups per batch
    reviewMaxPages: 60, // safety cap when a service is UNDER the threshold
  };

  // Public per-service reviews feed (same endpoint the dashboard uses). Bare
  // JSON array, newest-first, hard cap limit=20.
  const REVIEWS_URL = 'https://api.vgen.co/discoverability/reviews/service/';
  const REVIEW_PAGE = 20;

  const API_BASE = 'https://api.vgen.co';
  const API_HOST_RE = /(^|\/\/)api\.vgen\.co/i;

  // =====================================================================
  // Shared extraction helpers
  // =====================================================================

  // Responses vary: a bare array, { showcases: [...] }, { results: [...] },
  // { data: [...] }, etc. Return the first array of objects found.
  function pickArray(json) {
    if (Array.isArray(json)) return json;
    if (!json || typeof json !== 'object') return [];
    const keys = ['showcases', 'results', 'items', 'services', 'hits', 'data', 'edges'];
    for (const k of keys) if (Array.isArray(json[k])) return json[k];
    for (const v of Object.values(json)) {
      if (Array.isArray(v) && v.some((x) => x && typeof x === 'object')) return v;
    }
    return [];
  }

  // Depth-limited search for a string value under a key matching /serviceid/i.
  function deepFindServiceId(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > 3) return null;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && /^service.?id$/i.test(k) && v.trim()) return v.trim();
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') {
        const found = deepFindServiceId(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  // Pull service fields from one result item, tolerating shapes. Also captures
  // VGen's built-in classification: `type` (FULLY_CUSTOM / PERSONALIZED),
  // `categoryID` (searchCategoryID — VGen's official category, opaque ID), and
  // artist-set `tags`.
  function pickService(item) {
    if (!item || typeof item !== 'object') return null;
    const node = item.node && typeof item.node === 'object' ? item.node : item; // GraphQL edges
    const svc = node.service && typeof node.service === 'object' ? node.service : null;
    const src = svc || node;
    const serviceID =
      (svc && (svc.serviceID || svc.id)) ||
      node.serviceID ||
      node.id ||
      deepFindServiceId(node, 0);
    if (!serviceID || typeof serviceID !== 'string') return null;
    const serviceName =
      (svc && (svc.title || svc.name || svc.serviceName)) ||
      node.serviceName ||
      node.title ||
      node.name ||
      '';
    const tags = Array.isArray(src.tags) ? src.tags : Array.isArray(node.tags) ? node.tags : [];
    return {
      serviceID: serviceID.trim(),
      serviceName: String(serviceName).trim(),
      type: String(src.type || node.type || ''),
      categoryID: String(src.searchCategoryID || node.searchCategoryID || ''),
      tags,
    };
  }

  // Accumulate services from any JSON blob into the shared map.
  function harvestJson(json, map) {
    const items = pickArray(json);
    let added = 0;
    for (const item of items) {
      const svc = pickService(item);
      if (!svc) continue;
      const prev = map.get(svc.serviceID);
      if (prev) {
        prev.count += 1;
        if (!prev.serviceName && svc.serviceName) prev.serviceName = svc.serviceName;
        if (!prev.type && svc.type) prev.type = svc.type;
        if (!prev.categoryID && svc.categoryID) prev.categoryID = svc.categoryID;
        if ((!prev.tags || !prev.tags.length) && svc.tags && svc.tags.length) prev.tags = svc.tags;
      } else {
        map.set(svc.serviceID, {
          serviceName: svc.serviceName,
          count: 1,
          type: svc.type,
          categoryID: svc.categoryID,
          tags: svc.tags,
        });
        added++;
      }
    }
    return added;
  }

  function mapToRows(map) {
    return [...map.entries()]
      .map(([serviceID, v]) => ({
        count: v.count,
        serviceName: v.serviceName || '(unknown)',
        serviceID,
        type: v.type || '',
        categoryID: v.categoryID || '',
        tags: Array.isArray(v.tags) ? v.tags : [],
      }))
      .sort((a, b) => b.count - a.count || a.serviceName.localeCompare(b.serviceName));
  }

  function downloadRows(rows) {
    if (!rows.length) {
      console.warn('[vgen] Nothing to download yet (0 services captured).');
      return;
    }
    const filename = `vgen-${CONFIG.term.replace(/\s+/g, '-')}-services.txt`;
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: 'text/plain;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    console.log(
      `%c[vgen] downloaded ${rows.length} services -> ${filename}`,
      'color:#56d987;font-weight:bold'
    );
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // =====================================================================
  // Review-count filter (both modes)
  // =====================================================================
  // The search endpoint carries NO review count, so to keep only services with
  // >= CONFIG.minReviews reviews we make ONE extra pass hitting each captured
  // service's public reviews feed. This is efficient: we stop paging a service
  // the moment its running total reaches the threshold (usually a single
  // request), and only keep paging past that for services still UNDER it (up to
  // reviewMaxPages) so we know they truly fall short.

  // Count a service's reviews, short-circuiting once `min` is reached.
  // Returns { count, atLeast } where atLeast=true means "count >= min"
  // (count is then a lower bound, not the exact total).
  async function reviewCount(serviceID, min, maxPages) {
    let total = 0;
    for (let page = 0; page < maxPages; page++) {
      const url =
        `${REVIEWS_URL}${encodeURIComponent(serviceID)}` +
        `?offset=${page * REVIEW_PAGE}&limit=${REVIEW_PAGE}`;
      let arr;
      try {
        const res = await fetch(url, {
          credentials: 'include',
          headers: { accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        arr = await res.json();
      } catch {
        break; // network/Cloudflare hiccup: treat what we have as final
      }
      const n = Array.isArray(arr) ? arr.length : 0;
      total += n;
      if (min > 0 && total >= min) return { count: total, atLeast: true };
      if (n < REVIEW_PAGE) break; // short page = end of this service's feed
    }
    return { count: total, atLeast: false };
  }

  // Enrich rows with their review count and drop those under CONFIG.minReviews.
  // Runs in small concurrent batches to stay polite. When minReviews <= 0 the
  // filter is disabled and rows pass through untouched.
  async function enrichAndFilter(rows) {
    const min = Number(CONFIG.minReviews) || 0;
    if (min <= 0) return rows;

    const batchSize = Math.max(1, Number(CONFIG.reviewConcurrency) || 4);
    const maxPages = Math.max(1, Number(CONFIG.reviewMaxPages) || 60);
    const kept = [];
    let dropped = 0;

    console.log(
      `%c[vgen] review filter: checking ${rows.length} services for >= ${min} reviews...`,
      'color:#6ee7ff;font-weight:bold'
    );

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((row) => reviewCount(row.serviceID, min, maxPages))
      );
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const { count, atLeast } = results[j];
        if (atLeast || count >= min) {
          kept.push({ ...row, reviewCount: count, reviewCountAtLeast: atLeast });
        } else {
          dropped++;
        }
      }
      console.log(
        `[vgen] review filter: ${Math.min(i + batchSize, rows.length)}/${rows.length} ` +
          `checked (kept ${kept.length}, dropped ${dropped})`
      );
      await sleep(CONFIG.pageGapMs);
    }

    // Preserve the original ordering signal (frequency), then review count.
    kept.sort(
      (a, b) =>
        b.count - a.count ||
        b.reviewCount - a.reviewCount ||
        a.serviceName.localeCompare(b.serviceName)
    );
    console.log(
      `%c[vgen] review filter done: kept ${kept.length}, dropped ${dropped} (< ${min} reviews)`,
      'color:#56d987;font-weight:bold'
    );
    return kept;
  }

  // =====================================================================
  // CAPTURE mode: hook fetch + XHR, harvest as the page lazy-loads
  // =====================================================================
  function startCapture() {
    if (window.__vgenHook) {
      console.log(
        `%c[vgen] capture already running (${window.__vgenHook.map.size} services). ` +
          `Search + scroll, then call vgenDump().`,
        'color:#6ee7ff;font-weight:bold'
      );
      return;
    }

    const map = new Map();
    const state = { map };

    const consume = (url, jsonPromise) => {
      if (!API_HOST_RE.test(String(url))) return;
      jsonPromise
        .then((json) => {
          const before = map.size;
          harvestJson(json, map);
          if (map.size !== before) {
            console.log(`[vgen] captured -> ${map.size} unique services so far`);
          }
        })
        .catch(() => {});
    };

    // fetch hook
    const origFetch = window.fetch;
    window.fetch = function (...args) {
      const p = origFetch.apply(this, args);
      p.then((res) => {
        try {
          const url = (args[0] && args[0].url) || String(args[0]);
          consume(url, res.clone().json());
        } catch {}
      }).catch(() => {});
      return p;
    };

    // XHR hook
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__vgenUrl = url;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      this.addEventListener('load', function () {
        try {
          const ct = this.getResponseHeader('content-type') || '';
          if (/json/i.test(ct)) {
            consume(this.__vgenUrl, Promise.resolve(JSON.parse(this.responseText)));
          }
        } catch {}
      });
      return origSend.apply(this, arguments);
    };

    window.__vgenHook = {
      map,
      stop() {
        window.fetch = origFetch;
        XMLHttpRequest.prototype.open = origOpen;
        XMLHttpRequest.prototype.send = origSend;
        delete window.__vgenHook;
        console.log('[vgen] hooks removed.');
      },
    };

    window.vgenDump = async () =>
      downloadRows(await enrichAndFilter(mapToRows(map)));
    window.vgenPeek = () => {
      const rows = mapToRows(map);
      console.table(rows);
      return rows;
    };
    window.vgenReset = () => {
      map.clear();
      console.log('[vgen] buffer cleared.');
    };
    window.vgenStop = () => window.__vgenHook && window.__vgenHook.stop();

    console.log(
      '%c[vgen] capture armed. Now: (1) run your search, (2) scroll to load all ' +
        'results, (3) call vgenDump().',
      'color:#6ee7ff;font-weight:bold'
    );
    console.log('[vgen] helpers: vgenDump() vgenPeek() vgenReset() vgenStop()');
  }

  // =====================================================================
  // FETCH mode: page through the results endpoint directly
  // =====================================================================
  // VGen's service search (commission/services/search) is CURSOR-paged: every
  // response carries `nextCursor` (1, 2, 3, ...) and the next request sends it
  // back as the cursor param. This also supports offset-paged endpoints
  // (skip / offset / start / page) if you ever point it at a different one.

  // Real POST body shape for commission/services/search (captured from the
  // Network Payload). `textQuery` is the search term; `cursor` starts null and
  // is replaced with each response's nextCursor.
  function defaultBody() {
    return {
      cursor: null,
      filters: { artist: {}, service: { searchCategoryVariantKeys: [] } },
      sortType: 'relevance',
      textQuery: CONFIG.term,
    };
  }

  // Decide the paging param + style from whichever key exists (URL or body).
  function detectPagingKeys(hasKey) {
    const off = ['skip', 'offset', 'start', 'page'].find(hasKey);
    if (off) return { kind: 'offset', param: off, isPageIndex: off === 'page' };
    const cur = ['cursor', 'nextCursor', 'after'].find(hasKey) || 'cursor';
    return { kind: 'cursor', param: cur };
  }

  // Find the "next page" token in a response (cursor-paged endpoints).
  function pickNextCursor(json) {
    if (!json || typeof json !== 'object') return null;
    for (const k of ['nextCursor', 'cursor', 'next', 'nextPage']) {
      if (json[k] !== undefined && json[k] !== null) return json[k];
    }
    return null;
  }

  async function getJson(url, method, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    };
    if (method === 'POST') {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body || {});
    }
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  async function runFetch() {
    const isPost = CONFIG.method === 'POST';
    let u;
    try {
      u = new URL(CONFIG.sampleUrl, location.origin);
    } catch {
      console.error('[vgen] CONFIG.sampleUrl is not a valid URL.');
      return;
    }

    const body = isPost ? { ...(CONFIG.body || defaultBody()) } : null;
    const hasKey = isPost ? (k) => body && k in body : (k) => u.searchParams.has(k);
    const paging = detectPagingKeys(hasKey);

    const map = new Map();
    let scanned = 0;
    let pageSize = (body && Number(body.limit)) || 20;
    let cursor = null;

    console.log(
      `%c[vgen] fetch mode (${isPost ? 'POST' : 'GET'}): up to ${CONFIG.maxResults} ` +
        `results (${paging.kind} paging via "${paging.param}")`,
      'color:#6ee7ff;font-weight:bold'
    );

    for (let page = 0; page < CONFIG.maxPages; page++) {
      const url = new URL(u.toString());
      const reqBody = isPost ? { ...body } : null;
      // Cursor mode forces page 0 to the start (null) so we always get the true
      // "first N" no matter what cursor the captured request had.
      let value;
      if (paging.kind === 'offset') {
        value = paging.isPageIndex ? page + 1 : page * pageSize;
      } else {
        value = page === 0 ? null : cursor; // null = start for cursor endpoints
      }
      if (isPost) {
        reqBody[paging.param] = value;
      } else if (value === null) {
        url.searchParams.delete(paging.param);
      } else {
        url.searchParams.set(paging.param, String(value));
      }

      let json;
      try {
        json = await getJson(url.toString(), isPost ? 'POST' : 'GET', reqBody);
      } catch (err) {
        console.error(`[vgen] page ${page} failed: ${err.message}`);
        if (page === 0) {
          console.warn(
            '[vgen] First page failed. On a logged-in vgen.co tab? For ' +
              'commission/services/search keep CONFIG.method="POST" and paste the ' +
              'request Payload into CONFIG.body. Otherwise use mode "capture".'
          );
        }
        break;
      }

      const items = pickArray(json);
      if (page === 0 && items.length) pageSize = items.length;
      if (!items.length) break;

      const slice = items.slice(0, Math.max(0, CONFIG.maxResults - scanned));
      harvestJson(slice, map);
      scanned += slice.length;
      console.log(
        `[vgen] page ${page}: +${items.length} (scanned ${scanned}/${CONFIG.maxResults}, ${map.size} unique)`
      );

      if (scanned >= CONFIG.maxResults) break;

      if (paging.kind === 'cursor') {
        const next = pickNextCursor(json);
        if (next === null || String(next) === String(cursor)) break; // end / no progress
        cursor = next;
      } else if (items.length < pageSize) {
        break; // short page = end of results
      }
      await sleep(CONFIG.pageGapMs);
    }

    const rows = mapToRows(map);
    if (!rows.length) {
      console.warn(
        '[vgen] No services extracted. The endpoint shape may differ — use mode ' +
          '"capture", or paste the real request Payload into CONFIG.body.'
      );
      return;
    }
    const kept = await enrichAndFilter(rows);
    console.table(kept);
    downloadRows(kept);
  }

  // ---- dispatch --------------------------------------------------------------
  if (CONFIG.mode === 'fetch') runFetch();
  else startCapture();
})();
