'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import { MessageBubble, type Message } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { GroupInfoPanel } from './GroupInfoPanel'

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
  conversationId: string
  currentUserId: string
}

export function ChatWindow({ conversationId, currentUserId }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<ConversationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const fetchConversation = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}`)
    if (res.ok) {
      const data = await res.json()
      setConversation(data.conversation)
    } else if (res.status === 403 || res.status === 404) {
      router.push('/messages')
    }
  }, [conversationId, router])

  const fetchMessages = useCallback(async (before?: string) => {
    const url = `/api/conversations/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    return data
  }, [conversationId])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    setHasMore(false)
    Promise.all([fetchConversation(), fetchMessages()]).then(([, msgData]) => {
      if (msgData) {
        setMessages(msgData.messages)
        setHasMore(msgData.hasMore)
      }
      setLoading(false)
      // Scroll to bottom after initial load
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    })
  }, [conversationId, fetchConversation, fetchMessages])

  // Real-time new messages
  useRealtimeChannel<Record<string, unknown>>({
    table: 'messages',
    event: 'INSERT',
    filter: `conversation_id=eq.${conversationId}`,
    onData: (payload) => {
      if (payload.eventType !== 'INSERT') return
      const raw = payload.new as Message
      // Resolve sender info from already-loaded conversation members (avoids an extra fetch)
      const member = conversation?.members.find(m => m.user_id === raw.sender_id)
      const enriched: Message = {
        ...raw,
        sender_display_name: member?.display_name ?? null,
        sender_avatar_url: member?.avatar_url ?? null,
        deleted_at: raw.deleted_at ?? null,
      }
      setMessages(prev => {
        if (prev.find(m => m.id === enriched.id)) return prev
        return [...prev, enriched]
      })
      if (isAtBottomRef.current || raw.sender_id === currentUserId) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    },
  })

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100

    // Load more when scrolled to top
    if (el.scrollTop < 100 && hasMore && !loadingMore) {
      setLoadingMore(true)
      const oldest = messages[0]?.created_at
      fetchMessages(oldest).then(data => {
        if (data) {
          const prevHeight = el.scrollHeight
          setMessages(prev => [...data.messages, ...prev])
          setHasMore(data.hasMore)
          // Restore scroll position
          setTimeout(() => {
            el.scrollTop = el.scrollHeight - prevHeight
          }, 0)
        }
        setLoadingMore(false)
      })
    }
  }, [hasMore, loadingMore, messages, fetchMessages])

  const handleDelete = useCallback(async (msgId: string) => {
    await fetch(`/api/conversations/${conversationId}/messages?messageId=${msgId}`, { method: 'DELETE' })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), content: null } : m))
  }, [conversationId])

  const handleSent = useCallback((msg: unknown) => {
    const m = msg as Message
    setMessages(prev => {
      if (prev.find(p => p.id === m.id)) return prev
      return [...prev, m]
    })
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  // Display info
  const getDisplayInfo = () => {
    if (!conversation) return { name: '', avatarUrl: null, initials: '' }
    if (conversation.type === 'group') {
      return {
        name: conversation.name ?? 'Group',
        avatarUrl: conversation.avatar_url,
        initials: (conversation.name ?? 'G').slice(0, 2).toUpperCase(),
      }
    }
    const other = conversation.members.find(m => m.user_id !== currentUserId)
    return {
      name: other?.display_name ?? 'Unknown',
      avatarUrl: other?.avatar_url ?? null,
      initials: (other?.display_name ?? '?').slice(0, 1).toUpperCase(),
    }
  }

  const { name, avatarUrl, initials } = getDisplayInfo()
  const isGroup = conversation?.type === 'group'

  // Group messages by date
  const groupedMessages: Array<{ date: string; messages: Message[] }> = []
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.date === date) {
      last.messages.push(msg)
    } else {
      groupedMessages.push({ date, messages: [msg] })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => router.push('/messages')}
          className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold
            ${isGroup ? 'bg-green-500' : 'bg-indigo-500'}`}>
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate text-sm">{name}</h2>
          {isGroup && conversation && (
            <p className="text-xs text-gray-400">{conversation.members.length} members</p>
          )}
        </div>

        {isGroup && (
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
      >
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-4">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg, i) => {
                const prevMsg = i > 0 ? group.messages[i - 1] : null
                const showSender = isGroup && prevMsg?.sender_id !== msg.sender_id
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === currentUserId}
                    showSender={showSender}
                    onDelete={handleDelete}
                  />
                )
              })}
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        onSent={handleSent}
        disabled={loading}
      />

      {/* Group info panel */}
      {showInfo && conversation && (
        <GroupInfoPanel
          conversation={conversation}
          currentUserId={currentUserId}
          onClose={() => setShowInfo(false)}
          onUpdated={fetchConversation}
        />
      )}
    </div>
  )
}
