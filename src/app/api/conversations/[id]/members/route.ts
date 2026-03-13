import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can add members
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (membership.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { error } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: id, user_id: userId, role: 'member' })

  if (error) return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })

  // System message
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  await supabase.from('messages').insert({
    conversation_id: id,
    type: 'system',
    content: `${profile?.display_name ?? 'A user'} joined the group`,
  })

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const targetUserId = url.searchParams.get('userId') ?? user.id

  // Can remove self, or admin can remove others
  if (targetUserId !== user.id) {
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single()

    if (membership?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', id)
    .eq('user_id', targetUserId)

  if (error) return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', targetUserId)
    .single()

  await supabase.from('messages').insert({
    conversation_id: id,
    type: 'system',
    content: targetUserId === user.id
      ? `${profile?.display_name ?? 'A user'} left the group`
      : `${profile?.display_name ?? 'A user'} was removed`,
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: myMembership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (myMembership?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { userId, role } = await request.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

  const { error } = await supabase
    .from('conversation_members')
    .update({ role })
    .eq('conversation_id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })

  return NextResponse.json({ success: true })
}
