'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import { NewConversationModal } from './NewConversationModal'

interface Member {
  user_id: string
  role: string
  display_name: string | null
  avatar_url: string | null
}

interface LastMessage {
  id: string
  content: string | null
  type: string
  sender_id: string | null
  created_at: string
}

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string | null
  avatar_url: string | null
  updated_at: string
  my_role: string
  last_read_at: string
  unread: boolean
  last_message: LastMessage | null
  members: Member[]
}

function getDisplayInfo(conv: Conversation, currentUserId: string) {
  if (conv.type === 'group') {
    return {
      name: conv.name ?? 'Group',
      avatarUrl: conv.avatar_url,
      initials: (conv.name ?? 'G').slice(0, 2).toUpperCase(),
    }
  }
  const other = conv.members.find(m => m.user_id !== currentUserId)
  return {
    name: other?.display_name ?? 'Unknown',
    avatarUrl: other?.avatar_url ?? null,
    initials: (other?.display_name ?? '?').slice(0, 1).toUpperCase(),
  }
}

function formatTime(ts: string) {
  const date = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getLastMessagePreview(msg: LastMessage | null, currentUserId: string) {
  if (!msg) return 'No messages yet'
  if (msg.type === 'system') return msg.content ?? ''
  if (msg.type === 'image') return '📷 Image'
  if (msg.type === 'file') return '📎 File'
  return msg.content ?? ''
}

export function ConversationList({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Refresh list when new messages arrive in any conversation
  useRealtimeChannel({
    table: 'messages',
    event: 'INSERT',
    onData: () => fetchConversations(),
  })

  // Refresh when added to a new conversation
  useRealtimeChannel({
    table: 'conversation_members',
    event: 'INSERT',
    filter: `user_id=eq.${currentUserId}`,
    onData: () => fetchConversations(),
  })

  const currentConvId = pathname.startsWith('/messages/') ? pathname.split('/')[2] : null

  const filtered = conversations.filter(c => {
    if (!search) return true
    const { name } = getDisplayInfo(c, currentUserId)
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowModal(true)}
              className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">
                {search ? 'No conversations found' : 'No conversations yet'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
                >
                  Start a conversation
                </button>
              )}
            </div>
          ) : (
            filtered.map(conv => {
              const { name, avatarUrl, initials } = getDisplayInfo(conv, currentUserId)
              const isActive = conv.id === currentConvId
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/messages/${conv.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left
                    ${isActive ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm
                        ${conv.type === 'group' ? 'bg-green-500' : 'bg-indigo-500'}`}>
                        {initials}
                      </div>
                    )}
                    {conv.unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${conv.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {name}
                      </span>
                      {conv.last_message && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${conv.unread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {getLastMessagePreview(conv.last_message, currentUserId)}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {showModal && (
        <NewConversationModal
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
          onCreated={(id) => {
            setShowModal(false)
            fetchConversations()
            router.push(`/messages/${id}`)
          }}
        />
      )}
    </>
  )
}
