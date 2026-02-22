import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { API_URL, apiFetch } from '../config'

export default function NotificationSettings({ ficId, ficStatus }) {
  const [notifyOnComplete, setNotifyOnComplete] = useState(false)
  const [bingeThreshold, setBingeThreshold] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  // Only show for WIPs
  if (ficStatus === 'Complete') return null

  useEffect(() => {
    fetchSettings()
  }, [ficId])

  const fetchSettings = async () => {
    try {
      const response = await apiFetch(`${API_URL}/fics/${ficId}/notifications`)
      const data = await response.json()
      setNotifyOnComplete(data.notify_on_complete)
      setBingeThreshold(data.binge_threshold || 0)
      setLastChecked(data.last_checked_at)
    } catch (err) {
      console.error('Failed to fetch notification settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch(`${API_URL}/fics/${ficId}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_on_complete: notifyOnComplete,
          binge_threshold: bingeThreshold,
        }),
      })
      toast.success('Notification settings saved')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse h-20 bg-vault-bg rounded-xl" />
    )
  }

  const bingeOptions = [
    { value: 0, label: 'Off' },
    { value: 3, label: '3 chapters' },
    { value: 5, label: '5 chapters' },
    { value: 10, label: '10 chapters' },
  ]

  return (
    <div className="vault-card border-yellow-500/20">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔔</span>
        <h3 className="text-lg font-semibold">WIP Notifications</h3>
      </div>

      <div className="space-y-4">
        {/* Notify When Complete */}
        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <div className="text-sm font-medium text-vault-text group-hover:text-accent-gold transition-colors">
              Notify when complete
            </div>
            <div className="text-xs text-vault-muted">
              Only alert me when this fic is marked as finished
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={notifyOnComplete}
              onChange={(e) => setNotifyOnComplete(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              notifyOnComplete ? 'bg-accent-gold' : 'bg-vault-border'
            }`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${
                notifyOnComplete ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
              }`} />
            </div>
          </div>
        </label>

        {/* Binge Threshold */}
        <div>
          <div className="text-sm font-medium text-vault-text mb-2">
            Binge reading threshold
          </div>
          <div className="text-xs text-vault-muted mb-3">
            Alert when this many new chapters drop at once
          </div>
          <div className="flex gap-2">
            {bingeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBingeThreshold(opt.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  bingeThreshold === opt.value
                    ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/50'
                    : 'bg-vault-bg text-vault-muted border border-vault-border hover:border-vault-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="vault-btn-primary w-full text-sm"
        >
          {saving ? 'Saving...' : 'Save Notification Settings'}
        </button>

        {/* Last Checked Info */}
        {lastChecked && (
          <p className="text-xs text-vault-muted text-center">
            Last checked: {new Date(lastChecked).toLocaleDateString()} at{' '}
            {new Date(lastChecked).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}
