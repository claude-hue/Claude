'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Subscriber {
  userId: string
  displayName: string | null
  isAdmin: boolean
  deviceCount: number
  lastSeen: string | null
}

interface NotificationEntry {
  id: string
  user_id: string | null
  displayName: string | null
  title: string
  body: string | null
  status: 'pending' | 'sent' | 'failed'
  trigger_type: string | null
  sent_at: string | null
  created_at: string
}

export default function AdminPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form state
  const [target, setTarget] = useState<'broadcast' | string>('broadcast')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null)

  const fetchData = useCallback(async () => {
    const [subRes, notifRes] = await Promise.all([
      fetch('/api/admin/subscribers'),
      fetch('/api/admin/notifications'),
    ])

    if (subRes.status === 403 || notifRes.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }

    const subData = subRes.ok ? await subRes.json() : { subscribers: [] }
    const notifData = notifRes.ok ? await notifRes.json() : { notifications: [] }

    setSubscribers(subData.subscribers ?? [])
    setNotifications(notifData.notifications ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSending(true)
    setSendResult(null)

    try {
      const isBroadcast = target === 'broadcast'
      const endpoint = isBroadcast ? '/api/push/broadcast' : '/api/push/send'
      const payload = isBroadcast
        ? { title: title.trim(), body: body.trim() || undefined, url: url.trim() || undefined }
        : { targetUserId: target, title: title.trim(), body: body.trim() || undefined, url: url.trim() || undefined }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSendResult({ ok: true, message: isBroadcast ? 'Broadcast sent successfully' : 'Notification sent successfully' })
        setTitle('')
        setBody('')
        setUrl('')
        // Refresh notification history
        const notifRes = await fetch('/api/admin/notifications')
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          setNotifications(notifData.notifications ?? [])
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setSendResult({ ok: false, message: data.error ?? 'Failed to send notification' })
      }
    } catch {
      setSendResult({ ok: false, message: 'Network error — check your connection' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </main>
    )
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500 mb-4">You need admin privileges to view this page.</p>
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </main>
    )
  }

  const subscribedUsers = subscribers.filter((s) => s.deviceCount > 0)

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="text-gray-500 hover:text-gray-900 text-sm">
          Settings
        </Link>
        <h1 className="font-bold text-gray-900">Push Notifications — Admin</h1>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Send Notification */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Notification</h2>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="broadcast">📢 Broadcast to all ({subscribers.reduce((a, s) => a + s.deviceCount, 0)} devices)</option>
                {subscribedUsers.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.displayName ?? s.userId} — {s.deviceCount} device{s.deviceCount !== 1 ? 's' : ''}
                    {s.isAdmin ? ' (admin)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Optional message body"
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Optional URL to open on tap (e.g. /dashboard)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {sendResult && (
              <div className={`rounded-lg px-4 py-3 text-sm ${sendResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {sendResult.message}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !title.trim()}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending…' : target === 'broadcast' ? 'Send Broadcast' : 'Send Notification'}
            </button>
          </form>
        </section>

        {/* Subscribers */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Subscribers
            <span className="ml-2 text-sm font-normal text-gray-400">({subscribedUsers.length} of {subscribers.length} users)</span>
          </h2>
          {subscribers.length === 0 ? (
            <p className="text-sm text-gray-400">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium text-center">Devices</th>
                    <th className="pb-2 font-medium">Last Active</th>
                    <th className="pb-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscribers.map((s) => (
                    <tr key={s.userId}>
                      <td className="py-3 text-gray-900">
                        {s.displayName ?? <span className="text-gray-400 font-mono text-xs">{s.userId.slice(0, 8)}…</span>}
                      </td>
                      <td className="py-3 text-center">
                        {s.deviceCount > 0 ? (
                          <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">{s.deviceCount}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500">
                        {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3">
                        {s.isAdmin ? (
                          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">Admin</span>
                        ) : (
                          <span className="text-gray-300 text-xs">User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Notification History */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400">No notifications sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">To</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="py-3 text-gray-900 max-w-[180px] truncate" title={n.title}>{n.title}</td>
                      <td className="py-3 text-gray-500">{n.displayName ?? (n.user_id ? 'User' : 'Broadcast')}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                          n.status === 'sent' ? 'bg-green-100 text-green-700' :
                          n.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {new Date(n.sent_at ?? n.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
