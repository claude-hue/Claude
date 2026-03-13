import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BugReportButton } from '@/components/BugReportButton'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      {children}
      <BugReportButton />
    </>
  )
}
