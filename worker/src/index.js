/**
 * AO3 Proxy Worker
 *
 * Runs on Cloudflare's edge network to fetch AO3 pages and EPUBs.
 *
 * Usage:
 *   GET /?url=https://archiveofourown.org/works/12345         → HTML page (text/html)
 *   GET /?url=https://archiveofourown.org/downloads/12345/... → EPUB download (base64 JSON)
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request, env),
      });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, request, env);
    }

    // Get the URL parameter
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return jsonResponse({ error: 'Missing ?url= parameter' }, 400, request, env);
    }

    // Only allow AO3 URLs (prevent open proxy abuse)
    if (!targetUrl.includes('archiveofourown.org')) {
      return jsonResponse({ error: 'Only archiveofourown.org URLs are allowed' }, 403, request, env);
    }

    const isEpubDownload = targetUrl.includes('/downloads/');

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': isEpubDownload
        ? 'application/epub+zip,application/octet-stream,*/*'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    // For HTML pages, ensure ?view_adult=true is present
    let finalUrl = targetUrl;
    if (!isEpubDownload) {
      const fetchUrl = new URL(targetUrl);
      if (!fetchUrl.searchParams.has('view_adult')) {
        fetchUrl.searchParams.set('view_adult', 'true');
      }
      finalUrl = fetchUrl.toString();
    }

    try {
      const ao3Response = await fetch(finalUrl, {
        headers: fetchHeaders,
        redirect: 'follow',
      });

      if (ao3Response.status === 429) {
        const retryAfter = ao3Response.headers.get('Retry-After');
        const retryAfterSec = retryAfter ? parseInt(retryAfter) : 60;
        return jsonResponse(
          {
            error: `AO3 rate limited (429). Try again in ${retryAfterSec}s.`,
            rateLimited: true,
            retryAfter: retryAfterSec,
          },
          429,
          request,
          env
        );
      }

      if (!ao3Response.ok) {
        return jsonResponse(
          { error: `AO3 returned status ${ao3Response.status}` },
          ao3Response.status,
          request,
          env
        );
      }

      // EPUB download — return as base64 JSON so the client can pass it to the server
      if (isEpubDownload) {
        const buffer = await ao3Response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Convert to base64 in chunks to avoid call stack overflow on large files
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);

        return jsonResponse({ epub: base64, size: bytes.length }, 200, request, env);
      }

      // HTML page — return as text
      const html = await ao3Response.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...corsHeaders(request, env),
        },
      });
    } catch (err) {
      return jsonResponse(
        { error: `AO3 fetch failed: ${err.message}`, rateLimited: false, retryAfter: 0 },
        502,
        request,
        env
      );
    }
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',');

  // Allow the requesting origin if it's in our whitelist, or allow all in dev
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
    },
  });
}
