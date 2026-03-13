import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessagesLayoutClient } from '@/components/chat/MessagesLayoutClient'

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <MessagesLayoutClient currentUserId={user.id}>
      {children}
    </MessagesLayoutClient>
  )
}
