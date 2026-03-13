'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface User {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface Props {
  currentUserId: string
  onClose: () => void
  onCreated: (conversationId: string) => void
}

export function NewConversationModal({ onClose, onCreated }: Props) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setResults(data.users ?? [])
    }
    setSearching(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const toggleSelect = (user: User) => {
    if (tab === 'direct') {
      setSelected([user])
    } else {
      setSelected(prev =>
        prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
      )
    }
  }

  const create = async () => {
    if (creating) return
    if (tab === 'direct' && selected.length !== 1) return
    if (tab === 'group' && !groupName.trim()) return
    setCreating(true)

    try {
      const body = tab === 'direct'
        ? { type: 'direct', targetUserId: selected[0].id }
        : { type: 'group', name: groupName.trim(), description: groupDescription.trim() || undefined, memberIds: selected.map(u => u.id) }

      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        onCreated(data.conversation.id)
      }
    } finally {
      setCreating(false)
    }
  }

  const canCreate = tab === 'direct' ? selected.length === 1 : groupName.trim().length > 0

  const initials = (u: User) => (u.display_name ?? '?').slice(0, 1).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl flex flex-col max-h-[90dvh] rounded-t-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">New Conversation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(['direct', 'group'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected([]) }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors
                ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'direct' ? 'Direct Message' : 'New Group'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Group fields */}
          {tab === 'group' && (
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name (required)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={groupDescription}
                onChange={e => setGroupDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Selected users (group) */}
          {tab === 'group' && selected.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selected.map(u => (
                <span key={u.id} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                  {u.display_name ?? 'Unknown'}
                  <button onClick={() => toggleSelect(u)} className="leading-none text-indigo-400 hover:text-indigo-600">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search users by name…"
              className="w-full px-3 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Results */}
          {results.map(u => {
            const isSelected = selected.find(s => s.id === u.id)
            return (
              <button
                key={u.id}
                onClick={() => toggleSelect(u)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left mb-1
                  ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'}`}
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-400 flex items-center justify-center text-white text-sm font-semibold">
                    {initials(u)}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900">{u.display_name ?? 'Unknown'}</span>
                {isSelected && (
                  <svg className="ml-auto w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}

          {query.length >= 2 && results.length === 0 && !searching && (
            <p className="text-sm text-gray-400 text-center py-4">No users found</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={create}
            disabled={!canCreate || creating}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : tab === 'direct' ? 'Start Conversation' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}
