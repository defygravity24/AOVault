import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL, apiFetch } from '../config'

const STATUS_CONFIG = {
  healthy: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', dot: 'bg-emerald-400', label: 'Healthy' },
  degraded: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', dot: 'bg-amber-400', label: 'Degraded' },
  rate_limited: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', dot: 'bg-amber-400', label: 'Rate Limited' },
  down: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', dot: 'bg-red-400', label: 'Down' },
  starting: { color: 'text-vault-muted', bg: 'bg-white/5', border: 'border-vault-border', dot: 'bg-vault-muted', label: 'Starting...' },
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.starting
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${status === 'healthy' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  )
}

function ResponseTime({ ms }) {
  if (!ms && ms !== 0) return <span className="text-vault-muted text-sm">--</span>
  const color = ms < 500 ? 'text-emerald-400' : ms < 2000 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-sm font-mono ${color}`}>{ms}ms</span>
}

function CheckCard({ title, icon, status, responseTimeMs, details, lastChecked }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.starting

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-medium text-vault-text">{title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <ResponseTime ms={responseTimeMs} />
        {lastChecked && (
          <span className="text-vault-muted text-xs">
            {new Date(lastChecked).toLocaleTimeString()}
          </span>
        )}
      </div>

      {details && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-vault-muted hover:text-vault-text mt-2 transition-colors"
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          {expanded && (
            <pre className="mt-2 text-xs text-vault-muted bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  )
}

function AgentSection({ title, emoji, description, checks }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-semibold text-vault-text">{title}</h2>
      </div>
      <p className="text-vault-muted text-sm mb-4 ml-10">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check, i) => (
          <CheckCard key={i} {...check} />
        ))}
      </div>
    </div>
  )
}

function HistoryChart({ history }) {
  if (!history || history.length === 0) return null

  // Group by agent and show last 20 checks as mini dots
  const agents = ['ao3', 'api', 'app']
  const agentNames = { ao3: 'AO3', api: 'API', app: 'App' }
  const statusColors = {
    healthy: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    rate_limited: 'bg-amber-400',
    down: 'bg-red-400',
  }

  return (
    <div className="rounded-xl border border-vault-border bg-vault-card p-4 mb-8">
      <h3 className="font-medium text-vault-text mb-4">Last 24 Hours</h3>
      {agents.map(agent => {
        const agentChecks = history.filter(c => c.agent === agent).slice(0, 30)
        if (agentChecks.length === 0) return null
        return (
          <div key={agent} className="flex items-center gap-3 mb-3 last:mb-0">
            <span className="text-xs text-vault-muted w-8 font-mono">{agentNames[agent]}</span>
            <div className="flex gap-0.5 flex-1">
              {agentChecks.reverse().map((check, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-6 rounded-sm ${statusColors[check.status] || 'bg-vault-muted/30'}`}
                  title={`${check.check_type}: ${check.status} (${check.response_time_ms}ms) — ${new Date(check.checked_at).toLocaleTimeString()}`}
                />
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex gap-4 mt-3 text-xs text-vault-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Healthy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /> Degraded</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> Down</span>
      </div>
    </div>
  )
}

export default function Monitor() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/monitor/status`)
      const json = await res.json()
      setData(json)
    } catch {
      // offline or server down
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/monitor/history?hours=24&limit=200`)
      const json = await res.json()
      setHistory(json.checks || [])
    } catch {
      // ignore
    }
  }, [])

  const triggerCheck = async () => {
    setRefreshing(true)
    try {
      const res = await apiFetch(`${API_URL}/monitor/check`, { method: 'POST' })
      const json = await res.json()
      setData(json)
      fetchHistory()
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchHistory()
  }, [fetchStatus, fetchHistory])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchStatus()
      fetchHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchStatus, fetchHistory])

  const overallConfig = data?.overall ? STATUS_CONFIG[data.overall] : STATUS_CONFIG.starting

  return (
    <div className="min-h-screen bg-vault-bg text-vault-text">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-vault-bg/95 backdrop-blur border-b border-vault-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-vault-muted hover:text-vault-text transition-colors text-sm"
            >
              &larr; Back
            </button>
            <h1 className="text-lg font-semibold">System Monitor</h1>
            {data?.overall && <StatusBadge status={data.overall} />}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-vault-muted cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={triggerCheck}
              disabled={refreshing}
              className="vault-btn-secondary text-sm flex items-center gap-2"
            >
              {refreshing ? (
                <span className="w-3.5 h-3.5 border-2 border-vault-muted/30 border-t-vault-muted rounded-full animate-spin" />
              ) : (
                '🔄'
              )}
              {refreshing ? 'Checking...' : 'Check Now'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Overall Status Banner */}
        {data?.overall && (
          <div className={`rounded-xl border ${overallConfig.border} ${overallConfig.bg} p-5 mb-8 flex items-center justify-between`}>
            <div>
              <div className={`text-2xl font-bold ${overallConfig.color}`}>
                {data.overall === 'healthy' ? 'All Systems Operational' :
                 data.overall === 'degraded' ? 'Partial Degradation' :
                 'System Issues Detected'}
              </div>
              <p className="text-vault-muted text-sm mt-1">
                Last checked: {data.checkedAt ? new Date(data.checkedAt).toLocaleString() : 'never'}
                {data.durationMs ? ` (${data.durationMs}ms)` : ''}
              </p>
            </div>
            <span className="text-4xl">
              {data.overall === 'healthy' ? '✅' : data.overall === 'degraded' ? '⚠️' : '🔴'}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin mx-auto mb-4" />
              <p className="text-vault-muted text-sm">Loading monitor data...</p>
            </div>
          </div>
        ) : data?.status === 'starting' ? (
          <div className="text-center py-20">
            <span className="text-4xl mb-4 block">⏳</span>
            <p className="text-vault-muted">Agents are initializing. First check runs in ~10 seconds.</p>
            <button onClick={triggerCheck} className="vault-btn-primary mt-4 text-sm">
              Run First Check Now
            </button>
          </div>
        ) : data ? (
          <>
            {/* History Chart */}
            <HistoryChart history={history} />

            {/* AO3 Agent */}
            {data.ao3 && (
              <AgentSection
                title="AO3 Health Agent"
                emoji="📖"
                description="Monitors AO3 accessibility and Cloudflare Worker proxy status"
                checks={[
                  {
                    title: 'AO3 Direct',
                    icon: '🌐',
                    status: data.ao3.direct?.status,
                    responseTimeMs: data.ao3.direct?.responseTimeMs,
                    details: data.ao3.direct?.details,
                    lastChecked: data.checkedAt,
                  },
                  {
                    title: 'CF Worker Proxy',
                    icon: '☁️',
                    status: data.ao3.worker?.status,
                    responseTimeMs: data.ao3.worker?.responseTimeMs,
                    details: data.ao3.worker?.details,
                    lastChecked: data.checkedAt,
                  },
                ]}
              />
            )}

            {/* API Agent */}
            {data.api && (
              <AgentSection
                title="API Health Agent"
                emoji="🔧"
                description="Monitors backend server, database connectivity, and endpoint response times"
                checks={[
                  {
                    title: 'API Server',
                    icon: '💚',
                    status: data.api.health?.status,
                    responseTimeMs: data.api.health?.responseTimeMs,
                    details: data.api.health?.details,
                    lastChecked: data.checkedAt,
                  },
                  {
                    title: 'Database',
                    icon: '🗄️',
                    status: data.api.database?.status,
                    responseTimeMs: data.api.database?.responseTimeMs,
                    details: data.api.database?.details,
                    lastChecked: data.checkedAt,
                  },
                  {
                    title: 'Stats Endpoint',
                    icon: '📊',
                    status: data.api.stats?.status,
                    responseTimeMs: data.api.stats?.responseTimeMs,
                    details: data.api.stats?.details,
                    lastChecked: data.checkedAt,
                  },
                ]}
              />
            )}

            {/* App Agent */}
            {data.app && (
              <AgentSection
                title="App Health Agent"
                emoji="📱"
                description="Monitors frontend availability and import flow functionality"
                checks={[
                  {
                    title: 'Frontend Load',
                    icon: '🖥️',
                    status: data.app.frontend?.status,
                    responseTimeMs: data.app.frontend?.responseTimeMs,
                    details: data.app.frontend?.details,
                    lastChecked: data.checkedAt,
                  },
                  {
                    title: 'Import Flow',
                    icon: '📥',
                    status: data.app.importFlow?.status,
                    responseTimeMs: data.app.importFlow?.responseTimeMs,
                    details: data.app.importFlow?.details,
                    lastChecked: data.checkedAt,
                  },
                ]}
              />
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <span className="text-4xl mb-4 block">❌</span>
            <p className="text-vault-muted">Could not connect to monitoring service.</p>
            <button onClick={triggerCheck} className="vault-btn-primary mt-4 text-sm">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
