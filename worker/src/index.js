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

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    // Retry up to 3 times with increasing delays for rate limits (429)
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry: 2s, 5s
          await new Promise(r => setTimeout(r, attempt * 2500));
        }

        const ao3Response = await fetch(targetUrl, {
          headers: fetchHeaders,
          redirect: 'follow',
        });

        if (ao3Response.status === 429) {
          const retryAfter = ao3Response.headers.get('Retry-After');
          const waitSec = retryAfter ? parseInt(retryAfter) : 5;
          lastError = `Rate limited (429), Retry-After: ${waitSec}s`;
          // Wait up to 45 seconds if AO3 tells us to (CF Workers have 30s CPU limit but wall clock is fine)
          if (waitSec <= 45) {
            await new Promise(r => setTimeout(r, (waitSec + 2) * 1000));
          }
          continue; // retry
        }

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
        lastError = err.message;
        continue; // retry on network errors too
      }
    }

    // All retries exhausted
    return jsonResponse(
      { error: `AO3 fetch failed after ${maxRetries} attempts: ${lastError}` },
      502,
      request,
      env
    );
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
