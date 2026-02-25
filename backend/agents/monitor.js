/**
 * AOVault Monitoring Engine
 *
 * Runs three agents on intervals:
 *   1. AO3 Health Agent - checks AO3 + CF Worker accessibility
 *   2. API Health Agent - checks backend endpoints + DB connectivity
 *   3. App Health Agent - checks frontend loads + import flow
 *
 * Results stored in health_checks table, served via /api/monitor routes.
 */

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const AGENT_TIMEOUT = 15000; // 15 second timeout per check

// Lazy-load axios (same pattern as index.js)
let axios;
const getAxios = () => { if (!axios) axios = require('axios'); return axios; };

/**
 * Initialize the health_checks table
 */
async function initMonitorDB(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS health_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      check_type TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time_ms INTEGER,
      details TEXT,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Keep only last 7 days of checks to avoid table bloat
  await db.exec(`
    DELETE FROM health_checks
    WHERE checked_at < datetime('now', '-7 days')
  `);

  console.log('[Monitor] Database initialized');
}

/**
 * Record a health check result
 */
async function recordCheck(db, agent, checkType, status, responseTimeMs, details) {
  await db.prepare(
    'INSERT INTO health_checks (agent, check_type, status, response_time_ms, details) VALUES (?, ?, ?, ?, ?)'
  ).run(agent, checkType, status, responseTimeMs, JSON.stringify(details));
}

// =============================================
// AGENT 1: AO3 Health
// =============================================
async function checkAO3Direct() {
  const start = Date.now();
  try {
    const res = await getAxios().get('https://archiveofourown.org', {
      timeout: AGENT_TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0 (AOVault Health Check)' },
      validateStatus: () => true,
    });
    return {
      status: res.status < 400 ? 'healthy' : (res.status === 429 ? 'rate_limited' : 'degraded'),
      responseTimeMs: Date.now() - start,
      details: { httpStatus: res.status, statusText: res.statusText },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function checkCFWorker() {
  const start = Date.now();
  const testUrl = 'https://archiveofourown.org/works/61463624';
  const workerUrl = process.env.AO3_PROXY_URL || 'https://ao3-proxy.defy-gravity-24-sda.workers.dev';
  try {
    const res = await getAxios().get(`${workerUrl}/?url=${encodeURIComponent(testUrl)}`, {
      timeout: AGENT_TIMEOUT,
      validateStatus: () => true,
    });
    const isHtml = typeof res.data === 'string' && res.data.includes('<!DOCTYPE') || res.data.includes('<html');
    if (res.status === 200 && isHtml) {
      return {
        status: 'healthy',
        responseTimeMs: Date.now() - start,
        details: { httpStatus: 200, hasHtml: true },
      };
    }
    // Parse error response
    let errorMsg = '';
    if (typeof res.data === 'object') {
      errorMsg = res.data.error || JSON.stringify(res.data);
    } else if (typeof res.data === 'string') {
      errorMsg = res.data.substring(0, 200);
    }
    const isRateLimited = errorMsg.includes('429') || errorMsg.includes('Rate limit');
    return {
      status: isRateLimited ? 'rate_limited' : 'degraded',
      responseTimeMs: Date.now() - start,
      details: { httpStatus: res.status, error: errorMsg },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function runAO3Agent(db) {
  const [direct, worker] = await Promise.all([
    checkAO3Direct(),
    checkCFWorker(),
  ]);

  await recordCheck(db, 'ao3', 'direct', direct.status, direct.responseTimeMs, direct.details);
  await recordCheck(db, 'ao3', 'cf_worker', worker.status, worker.responseTimeMs, worker.details);

  return { direct, worker };
}

// =============================================
// AGENT 2: API Health
// =============================================
async function checkAPIHealth() {
  const start = Date.now();
  const baseUrl = process.env.APP_URL || 'https://aovault.net';
  try {
    const res = await getAxios().get(`${baseUrl}/api/health`, {
      timeout: AGENT_TIMEOUT,
      validateStatus: () => true,
    });
    return {
      status: res.status === 200 ? 'healthy' : 'degraded',
      responseTimeMs: Date.now() - start,
      details: { httpStatus: res.status, body: res.data },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function checkDBHealth(db) {
  const start = Date.now();
  try {
    const row = await db.prepare('SELECT COUNT(*) as count FROM fics').get();
    return {
      status: 'healthy',
      responseTimeMs: Date.now() - start,
      details: { ficCount: row.count, dbType: db.isTurso ? 'turso' : 'sqlite' },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function checkAPIStats() {
  const start = Date.now();
  const baseUrl = process.env.APP_URL || 'https://aovault.net';
  try {
    const res = await getAxios().get(`${baseUrl}/api/stats`, {
      timeout: AGENT_TIMEOUT,
      validateStatus: () => true,
    });
    return {
      status: res.status === 200 ? 'healthy' : 'degraded',
      responseTimeMs: Date.now() - start,
      details: { httpStatus: res.status, ...(res.data || {}) },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function runAPIAgent(db) {
  const [health, database, stats] = await Promise.all([
    checkAPIHealth(),
    checkDBHealth(db),
    checkAPIStats(),
  ]);

  await recordCheck(db, 'api', 'health', health.status, health.responseTimeMs, health.details);
  await recordCheck(db, 'api', 'database', database.status, database.responseTimeMs, database.details);
  await recordCheck(db, 'api', 'stats', stats.status, stats.responseTimeMs, stats.details);

  return { health, database, stats };
}

// =============================================
// AGENT 3: App Health
// =============================================
async function checkFrontendLoad() {
  const start = Date.now();
  const baseUrl = process.env.APP_URL || 'https://aovault.net';
  try {
    const res = await getAxios().get(baseUrl, {
      timeout: AGENT_TIMEOUT,
      validateStatus: () => true,
    });
    const hasReactRoot = typeof res.data === 'string' && res.data.includes('id="root"');
    const hasAssets = typeof res.data === 'string' && res.data.includes('.js');
    return {
      status: res.status === 200 && hasReactRoot ? 'healthy' : 'degraded',
      responseTimeMs: Date.now() - start,
      details: {
        httpStatus: res.status,
        hasReactRoot,
        hasAssets,
        sizeBytes: typeof res.data === 'string' ? res.data.length : 0,
      },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function checkImportFlow() {
  const start = Date.now();
  const baseUrl = process.env.APP_URL || 'https://aovault.net';
  // Don't actually import — just verify the endpoint responds to a bad URL gracefully
  try {
    const res = await getAxios().post(`${baseUrl}/api/fics/import`,
      { url: 'https://archiveofourown.org/works/99999999999' },
      {
        timeout: AGENT_TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      }
    );
    // 422 (needsClientFetch) or 404 (work not found) = endpoint is working
    // 500 = something is broken
    const isWorking = [422, 404, 409, 400].includes(res.status);
    return {
      status: isWorking ? 'healthy' : (res.status === 500 ? 'degraded' : 'healthy'),
      responseTimeMs: Date.now() - start,
      details: {
        httpStatus: res.status,
        response: typeof res.data === 'object' ? res.data : { raw: String(res.data).substring(0, 200) },
      },
    };
  } catch (err) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: { error: err.message },
    };
  }
}

async function runAppAgent(db) {
  const [frontend, importFlow] = await Promise.all([
    checkFrontendLoad(),
    checkImportFlow(),
  ]);

  await recordCheck(db, 'app', 'frontend', frontend.status, frontend.responseTimeMs, frontend.details);
  await recordCheck(db, 'app', 'import_flow', importFlow.status, importFlow.responseTimeMs, importFlow.details);

  return { frontend, importFlow };
}

// =============================================
// MONITORING ENGINE
// =============================================

let monitorInterval = null;
let lastResults = null;
let isRunning = false;

/**
 * Run all agents once
 */
async function runAllAgents(db) {
  if (isRunning) return lastResults;
  isRunning = true;

  try {
    console.log('[Monitor] Running health checks...');
    const startTime = Date.now();

    const [ao3, api, app] = await Promise.all([
      runAO3Agent(db),
      runAPIAgent(db),
      runAppAgent(db),
    ]);

    lastResults = {
      ao3,
      api,
      app,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    // Compute overall status
    const allStatuses = [
      ao3.direct.status, ao3.worker.status,
      api.health.status, api.database.status,
      app.frontend.status, app.importFlow.status,
    ];

    if (allStatuses.every(s => s === 'healthy')) {
      lastResults.overall = 'healthy';
    } else if (allStatuses.some(s => s === 'down')) {
      lastResults.overall = 'down';
    } else {
      lastResults.overall = 'degraded';
    }

    console.log(`[Monitor] Checks complete in ${lastResults.durationMs}ms — overall: ${lastResults.overall}`);

    // Prune old records (keep 7 days)
    await db.exec("DELETE FROM health_checks WHERE checked_at < datetime('now', '-7 days')");

    return lastResults;
  } catch (err) {
    console.error('[Monitor] Agent error:', err.message);
    return lastResults;
  } finally {
    isRunning = false;
  }
}

/**
 * Start the monitoring loop
 */
async function startMonitoring(db) {
  await initMonitorDB(db);

  // Run immediately on startup (after a short delay to let the server finish starting)
  setTimeout(() => runAllAgents(db), 10000);

  // Then every 5 minutes
  monitorInterval = setInterval(() => runAllAgents(db), CHECK_INTERVAL);

  console.log(`[Monitor] Started — checking every ${CHECK_INTERVAL / 1000}s`);
}

/**
 * Stop the monitoring loop
 */
function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[Monitor] Stopped');
  }
}

/**
 * Get last cached results (instant, no DB query)
 */
function getLastResults() {
  return lastResults;
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  runAllAgents,
  getLastResults,
  initMonitorDB,
};
