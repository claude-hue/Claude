'use client'

import { useState } from 'react'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  content: string | null
  type: 'text' | 'image' | 'file' | 'system'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
  deleted_at: string | null
  sender_display_name: string | null
  sender_avatar_url: string | null
}

interface Props {
  message: Message
  isOwn: boolean
  showSender: boolean
  onDelete?: (id: string) => void
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message: msg, isOwn, showSender, onDelete }: Props) {
  const [imgOpen, setImgOpen] = useState(false)
  const [showActions, setShowActions] = useState(false)

  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    )
  }

  if (msg.deleted_at) {
    return (
      <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="w-7 h-7 flex-shrink-0" />
        <div className={`px-3 py-2 rounded-2xl text-xs italic text-gray-400 bg-gray-100`}>
          This message was deleted
        </div>
      </div>
    )
  }

  const initials = (msg.sender_display_name ?? '?').slice(0, 1).toUpperCase()

  return (
    <>
      <div
        className={`flex items-end gap-2 mb-1 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Avatar (others only) */}
        {!isOwn ? (
          <div className="flex-shrink-0 self-end">
            {msg.sender_avatar_url ? (
              <img src={msg.sender_avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-semibold">
                {initials}
              </div>
            )}
          </div>
        ) : (
          <div className="w-7 flex-shrink-0" />
        )}

        <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name (groups, others) */}
          {showSender && !isOwn && (
            <span className="text-xs text-gray-400 mb-1 px-1">
              {msg.sender_display_name ?? 'Unknown'}
            </span>
          )}

          {/* Bubble */}
          <div
            className={`relative rounded-2xl overflow-hidden
              ${isOwn ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}
          >
            {msg.type === 'image' && msg.file_url ? (
              <button onClick={() => setImgOpen(true)} className="block">
                <img
                  src={msg.file_url}
                  alt={msg.file_name ?? 'Image'}
                  className="max-w-[240px] max-h-[320px] object-cover"
                />
                {msg.content && (
                  <p className="px-3 py-2 text-sm">{msg.content}</p>
                )}
              </button>
            ) : msg.type === 'file' && msg.file_url ? (
              <a
                href={msg.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-3 py-2.5 min-w-[180px] hover:opacity-80`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                  ${isOwn ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                  <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{msg.file_name ?? 'File'}</p>
                  <p className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {formatSize(msg.file_size)}
                  </p>
                </div>
                <svg className={`w-4 h-4 flex-shrink-0 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            ) : (
              <p className="px-3 py-2 text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            )}
          </div>

          {/* Timestamp */}
          <span className={`text-xs text-gray-400 mt-0.5 px-1`}>
            {formatTime(msg.created_at)}
          </span>
        </div>

        {/* Delete action (own messages) */}
        {isOwn && onDelete && showActions && (
          <button
            onClick={() => onDelete(msg.id)}
            className="self-center opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
            title="Delete message"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Full-size image modal */}
      {imgOpen && msg.file_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImgOpen(false)}
        >
          <img
            src={msg.file_url}
            alt={msg.file_name ?? 'Image'}
            className="max-w-full max-h-full object-contain rounded"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setImgOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
