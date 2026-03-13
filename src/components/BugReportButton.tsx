'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BugReportModal } from './BugReportModal'

export function BugReportButton() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Hide when in an active conversation (would overlap the input)
  const inConversation = /^\/messages\/[^/]+/.test(pathname)
  if (inConversation) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 w-11 h-11 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
        title="Report a bug"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>
      {open && <BugReportModal onClose={() => setOpen(false)} />}
    </>
  )
}
