'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface Member {
  user_id: string
  role: string
  display_name: string | null
  avatar_url: string | null
}

interface ConversationInfo {
  id: string
  type: 'direct' | 'group'
  name: string | null
  avatar_url: string | null
  members: Member[]
}

interface Props {
  conversation: ConversationInfo
  currentUserId: string
  onClose: () => void
  onUpdated: () => void
}

interface SearchUser {
  id: string
  display_name: string | null
  avatar_url: string | null
}

export function GroupInfoPanel({ conversation, currentUserId, onClose, onUpdated }: Props) {
  const myRole = conversation.members.find(m => m.user_id === currentUserId)?.role
  const isAdmin = myRole === 'admin'

  const [editName, setEditName] = useState(false)
  const [nameValue, setNameValue] = useState(conversation.name ?? '')
  const [savingName, setSavingName] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const existingIds = new Set(conversation.members.map(m => m.user_id))

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setSearchResults((data.users ?? []).filter((u: SearchUser) => !existingIds.has(u.id)))
    }
    setSearching(false)
  }, [existingIds])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchUsers(searchQuery), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, searchUsers])

  const saveName = async () => {
    if (!nameValue.trim()) return
    setSavingName(true)
    await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue.trim() }),
    })
    setSavingName(false)
    setEditName(false)
    onUpdated()
  }

  const addMember = async (userId: string) => {
    setAdding(userId)
    await fetch(`/api/conversations/${conversation.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setAdding(null)
    setSearchQuery('')
    setSearchResults([])
    onUpdated()
  }

  const removeMember = async (userId: string) => {
    setRemoving(userId)
    await fetch(`/api/conversations/${conversation.id}/members?userId=${userId}`, { method: 'DELETE' })
    setRemoving(null)
    onUpdated()
  }

  const promoteMember = async (userId: string) => {
    await fetch(`/api/conversations/${conversation.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: 'admin' }),
    })
    onUpdated()
  }

  const initials = (m: Member) => (m.display_name ?? '?').slice(0, 1).toUpperCase()

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-80 bg-white shadow-xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Group Info</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center text-xl">×</button>
        </div>

        <div className="px-4 py-4 border-b border-gray-100">
          {/* Group avatar */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
              {(conversation.name ?? 'G').slice(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Name */}
          {editName ? (
            <div className="flex gap-2">
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingName ? '…' : 'Save'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">{conversation.name ?? 'Group'}</span>
              {isAdmin && (
                <button onClick={() => setEditName(true)} className="text-indigo-600 text-sm hover:underline">Edit</button>
              )}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {conversation.members.length} Members
          </p>
          {conversation.members.map(m => (
            <div key={m.user_id} className="flex items-center gap-3 py-2">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-400 flex items-center justify-center text-white text-sm font-semibold">
                  {initials(m)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.display_name ?? 'Unknown'}
                  {m.user_id === currentUserId && <span className="text-gray-400"> (you)</span>}
                </p>
                {m.role === 'admin' && (
                  <p className="text-xs text-indigo-600">Admin</p>
                )}
              </div>
              {isAdmin && m.user_id !== currentUserId && (
                <div className="flex gap-1">
                  {m.role !== 'admin' && (
                    <button
                      onClick={() => promoteMember(m.user_id)}
                      className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-100"
                      title="Make admin"
                    >
                      ↑
                    </button>
                  )}
                  <button
                    onClick={() => removeMember(m.user_id)}
                    disabled={removing === m.user_id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {removing === m.user_id ? '…' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add members (admin only) */}
        {isAdmin && (
          <div className="px-4 py-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Add Members</p>
            <div className="relative mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full px-3 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {searchResults.map(u => (
              <button
                key={u.id}
                onClick={() => addMember(u.id)}
                disabled={adding === u.id}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-semibold">
                  {(u.display_name ?? '?').slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{u.display_name ?? 'Unknown'}</span>
                {adding === u.id ? (
                  <div className="ml-auto w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="ml-auto w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Leave group */}
        <div className="px-4 py-4 mt-auto border-t border-gray-100">
          <button
            onClick={() => removeMember(currentUserId)}
            className="w-full py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            Leave Group
          </button>
        </div>
      </div>
    </div>
  )
}
