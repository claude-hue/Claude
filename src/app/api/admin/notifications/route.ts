import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: notifications, error } = await service
    .from('notifications_log')
    .select('id, user_id, title, body, status, trigger_type, sent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  // Fetch display names for the user_ids
  const userIds = [...new Set((notifications ?? []).map((n) => n.user_id).filter(Boolean))] as string[]
  const { data: profileRows } = userIds.length
    ? await service.from('profiles').select('id, display_name').in('id', userIds)
    : { data: [] }

  const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]))

  const result = (notifications ?? []).map((n) => ({
    ...n,
    displayName: n.user_id ? (nameById.get(n.user_id) ?? null) : null,
  }))

  return NextResponse.json({ notifications: result })
}
