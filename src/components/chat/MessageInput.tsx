'use client'

import { useState, useRef, useCallback } from 'react'

interface Props {
  conversationId: string
  onSent: (message: unknown) => void
  disabled?: boolean
}

interface FilePreview {
  file: File
  previewUrl: string | null
  type: 'image' | 'file'
}

export function MessageInput({ conversationId, onSent, disabled }: Props) {
  const [text, setText] = useState('')
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adjustHeight = () => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const previewUrl = isImage ? URL.createObjectURL(file) : null
    setFilePreview({ file, previewUrl, type: isImage ? 'image' : 'file' })
    e.target.value = ''
  }, [])

  const clearFile = useCallback(() => {
    if (filePreview?.previewUrl) URL.revokeObjectURL(filePreview.previewUrl)
    setFilePreview(null)
  }, [filePreview])

  const send = useCallback(async () => {
    if (sending || (!text.trim() && !filePreview)) return
    setSending(true)

    try {
      let fileData: { url: string; name: string; size: number; mimeType: string; type: string } | null = null

      if (filePreview) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', filePreview.file)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        setUploading(false)
        if (!uploadRes.ok) throw new Error('Upload failed')
        fileData = await uploadRes.json()
      }

      const body: Record<string, unknown> = {
        type: fileData?.type ?? 'text',
        content: text.trim() || null,
      }
      if (fileData) {
        body.file_url = fileData.url
        body.file_name = fileData.name
        body.file_size = fileData.size
        body.mime_type = fileData.mimeType
      }

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        onSent(data.message)
        setText('')
        clearFile()
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
    } finally {
      setSending(false)
    }
  }, [sending, text, filePreview, conversationId, onSent, clearFile])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canSend = !sending && !disabled && (text.trim().length > 0 || filePreview !== null)

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      {/* File preview */}
      {filePreview && (
        <div className="mb-2 flex items-center gap-2 bg-gray-50 rounded-xl p-2">
          {filePreview.type === 'image' && filePreview.previewUrl ? (
            <img src={filePreview.previewUrl} alt="" className="w-12 h-12 object-cover rounded-lg" />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{filePreview.file.name}</p>
            <p className="text-xs text-gray-400">
              {uploading ? 'Uploading…' : `${(filePreview.file.size / 1024).toFixed(1)} KB`}
            </p>
          </div>
          <button onClick={clearFile} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.zip,video/mp4"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); adjustHeight() }}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 max-h-[120px] overflow-y-auto"
        />

        {/* Send button */}
        <button
          onClick={send}
          disabled={!canSend}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
