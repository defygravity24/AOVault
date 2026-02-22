/**
 * AO3 Proxy Worker
 *
 * Runs on Cloudflare's edge network to fetch AO3 pages.
 * Since AO3 uses Cloudflare for protection, requests from within
 * Cloudflare's network aren't blocked by IP-based restrictions.
 *
 * Usage: GET /?url=https://archiveofourown.org/works/12345
 * Returns: The HTML content of the AO3 page
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

    try {
      // Fetch from AO3 with browser-like headers
      const ao3Response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
      });

      if (!ao3Response.ok) {
        return jsonResponse(
          { error: `AO3 returned status ${ao3Response.status}` },
          ao3Response.status,
          request,
          env
        );
      }

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
        { error: `Fetch failed: ${err.message}` },
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
