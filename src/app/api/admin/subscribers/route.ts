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

  // Use service role to bypass RLS and read all users' data
  const service = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all profiles with subscription counts
  const { data: profiles, error: profilesError } = await service
    .from('profiles')
    .select('id, display_name, is_admin')
    .order('created_at', { ascending: true })

  if (profilesError) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }

  // Get subscription counts per user
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('user_id, last_used_at')

  const subsByUser = new Map<string, { count: number; lastSeen: string | null }>()
  for (const sub of subs ?? []) {
    const existing = subsByUser.get(sub.user_id)
    if (!existing) {
      subsByUser.set(sub.user_id, { count: 1, lastSeen: sub.last_used_at })
    } else {
      existing.count++
      if (sub.last_used_at && (!existing.lastSeen || sub.last_used_at > existing.lastSeen)) {
        existing.lastSeen = sub.last_used_at
      }
    }
  }

  const subscribers = profiles?.map((p) => ({
    userId: p.id,
    displayName: p.display_name,
    isAdmin: p.is_admin,
    deviceCount: subsByUser.get(p.id)?.count ?? 0,
    lastSeen: subsByUser.get(p.id)?.lastSeen ?? null,
  })) ?? []

  return NextResponse.json({ subscribers })
}
