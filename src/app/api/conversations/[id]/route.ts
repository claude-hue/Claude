import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conv, error } = await supabase
    .from('conversations')
    .select('id, type, name, description, avatar_url, created_by, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id, role')
    .eq('conversation_id', id)

  const memberUserIds = members?.map(m => m.user_id) ?? []
  if (!memberUserIds.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', memberUserIds)

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  const membersWithProfiles = (members ?? []).map(m => ({
    user_id: m.user_id,
    role: m.role,
    display_name: profileMap.get(m.user_id)?.display_name ?? null,
    avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
  }))

  return NextResponse.json({ conversation: { ...conv, members: membersWithProfiles } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin membership
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await request.json()
  const { name, description, avatar_url } = body

  const { data: updated, error } = await supabase
    .from('conversations')
    .update({ name, description, avatar_url })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })

  return NextResponse.json({ conversation: updated })
}
