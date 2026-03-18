/**
 * 72klar – Cloudflare Worker: Komunestatistikk
 *
 * KV namespace binding: STATS
 * Worker URL: https://72klar-stats.fisnik-rashica.workers.dev
 *
 * Endepunkter:
 *   POST /submit   { kommune: string, pct: number }  → lagrer count + sum per kommune
 *   GET  /stats    ?kommune=X                         → { kommune, count, avg }
 *   GET  /all                                         → [{ kommune, count, avg }, ...]
 *
 * Ingen persondata lagres – kun aggregerte tall per kommune.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url      = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, ''); // strip trailing slash

    try {
      if (request.method === 'POST' && pathname === '/submit') {
        return await handleSubmit(request, env);
      }
      if (request.method === 'GET' && pathname === '/stats') {
        return await handleStats(url, env);
      }
      if (request.method === 'GET' && pathname === '/all') {
        return await handleAll(env);
      }
      if (request.method === 'POST' && pathname === '/missing-kommune-request') {
        return await handleMissingKommuneRequest(request, env);
      }
      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      return jsonResponse({ error: 'Internal server error', detail: err.message }, 500);
    }
  },
};

// ── POST /submit ──────────────────────────────────────────────────────────────
async function handleSubmit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { kommune, pct } = body;

  if (typeof kommune !== 'string' || kommune.trim().length === 0) {
    return jsonResponse({ error: 'Missing or invalid "kommune"' }, 400);
  }
  if (typeof pct !== 'number' || pct < 0 || pct > 100) {
    return jsonResponse({ error: '"pct" must be a number between 0 and 100' }, 400);
  }

  const key      = `kommune:${kommune.trim().toLowerCase()}`;
  const existing = await env.STATS.get(key, { type: 'json' });
  const current  = existing ?? { count: 0, sum: 0 };

  const updated = {
    count: current.count + 1,
    sum:   current.sum   + pct,
  };
  await env.STATS.put(key, JSON.stringify(updated));

  return jsonResponse({ ok: true, kommune, count: updated.count, avg: Math.round(updated.sum / updated.count) });
}

// ── GET /stats?kommune=X ──────────────────────────────────────────────────────
async function handleStats(url, env) {
  const kommune = url.searchParams.get('kommune');
  if (!kommune) return jsonResponse({ error: 'Missing query param "kommune"' }, 400);

  const key  = `kommune:${kommune.trim().toLowerCase()}`;
  const data = await env.STATS.get(key, { type: 'json' });

  if (!data) return jsonResponse({ kommune, count: 0, avg: null });

  return jsonResponse({
    kommune,
    count: data.count,
    avg:   Math.round(data.sum / data.count),
  });
}

// ── GET /all ──────────────────────────────────────────────────────────────────
async function handleAll(env) {
  const list   = await env.STATS.list({ prefix: 'kommune:' });
  const result = [];

  for (const key of list.keys) {
    const data    = await env.STATS.get(key.name, { type: 'json' });
    const kommune = key.name.replace('kommune:', '');
    if (data) {
      result.push({
        kommune,
        count: data.count,
        avg:   Math.round(data.sum / data.count),
      });
    }
  }

  result.sort((a, b) => b.count - a.count);
  return jsonResponse(result);
}

// ── POST /missing-kommune-request ─────────────────────────────────────
async function handleMissingKommuneRequest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { kommune, postnr, navn, email } = body;

  if (typeof kommune !== 'string' || kommune.trim().length === 0) {
    return jsonResponse({ error: 'Missing or invalid "kommune"' }, 400);
  }
  if (typeof postnr !== 'string' || postnr.trim().length < 4) {
    return jsonResponse({ error: 'Missing or invalid "postnr"' }, 400);
  }

  // Validate email if provided
  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return jsonResponse({ error: 'Invalid email format' }, 400);
  }

  const timestamp = new Date().toISOString();
  const requestId = `${kommune.toLowerCase()}_${Date.now()}`;
  const key = `missing-kommune:${requestId}`;

  const data = {
    kommune: kommune.trim(),
    postnr: postnr.trim(),
    navn: navn && typeof navn === 'string' ? navn.trim() : null,
    email: email && typeof email === 'string' ? email.trim() : null,
    timestamp,
    userAgent: request.headers.get('User-Agent') || 'Unknown',
  };

  await env.STATS.put(key, JSON.stringify(data));

  // Also increment counter per kommune
  const counterKey = `missing-kommune-count:${kommune.toLowerCase()}`;
  const existing = await env.STATS.get(counterKey, { type: 'json' });
  const counter = existing || { count: 0, latestRequest: null };
  counter.count += 1;
  counter.latestRequest = timestamp;
  if (email) counter.latestEmail = email;
  await env.STATS.put(counterKey, JSON.stringify(counter));

  return jsonResponse({ ok: true, stored: true, requestId });
}

// ── Helper ────────────────────────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
