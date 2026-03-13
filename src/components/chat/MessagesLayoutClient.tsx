'use client'

import { usePathname } from 'next/navigation'
import { ConversationList } from './ConversationList'

interface Props {
  currentUserId: string
  children: React.ReactNode
}

export function MessagesLayoutClient({ currentUserId, children }: Props) {
  const pathname = usePathname()
  const inConversation = pathname !== '/messages'

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      {/* Sidebar */}
      <div className={`flex-shrink-0 w-full md:w-80 border-r border-gray-200 bg-white flex flex-col
        ${inConversation ? 'hidden md:flex' : 'flex'}`}>
        <ConversationList currentUserId={currentUserId} />
      </div>

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-w-0
        ${!inConversation ? 'hidden md:flex' : 'flex'}`}>
        {children}
      </div>
    </div>
  )
}
