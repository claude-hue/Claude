'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BugReport {
  id: string
  user_id: string | null
  title: string
  description: string | null
  category: string
  status: string
  created_at: string
  reporter_name: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
}

const CATEGORY_LABELS: Record<string, string> = {
  ui: 'UI',
  crash: 'Crash',
  performance: 'Performance',
  messaging: 'Messaging',
  other: 'Other',
}

export default function AdminBugsPage() {
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('open')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchReports = async () => {
    const res = await fetch('/api/admin/bugs')
    if (res.ok) {
      const data = await res.json()
      setReports(data.reports ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchReports() }, [])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    await fetch('/api/admin/bugs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    await fetchReports()
    setUpdating(null)
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900">Bug Reports</h1>
        <span className="ml-auto text-sm text-gray-400">{reports.filter(r => r.status === 'open').length} open</span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {['all', 'open', 'in_progress', 'resolved'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No {filter === 'all' ? '' : filter} reports</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{r.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status === 'in_progress' ? 'In Progress' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-sm text-gray-600 mb-2">{r.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {r.reporter_name} · {new Date(r.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  <select
                    value={r.status}
                    onChange={e => updateStatus(r.id, e.target.value)}
                    disabled={updating === r.id}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 flex-shrink-0"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
