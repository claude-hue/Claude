import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's memberships
  const { data: memberships, error: membErr } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at, role')
    .eq('user_id', user.id)

  if (membErr) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  if (!memberships || memberships.length === 0) return NextResponse.json({ conversations: [] })

  const convIds = memberships.map(m => m.conversation_id)
  const membershipMap = new Map(memberships.map(m => [m.conversation_id, m]))

  // Get conversations
  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('id, type, name, description, avatar_url, created_at, updated_at')
    .in('id', convIds)
    .order('updated_at', { ascending: false })

  if (convErr) return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })

  // Get all members for these conversations
  const { data: allMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, role')
    .in('conversation_id', convIds)

  const memberUserIds = [...new Set(allMembers?.map(m => m.user_id) ?? [])]

  // Get profiles for all members
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', memberUserIds)

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  // Get last message per conversation
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('id, conversation_id, content, type, sender_id, created_at')
    .in('conversation_id', convIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(convIds.length * 5)

  type RecentMessage = { id: string; conversation_id: string; content: string | null; type: string; sender_id: string | null; created_at: string }
  const lastMessageMap = new Map<string, RecentMessage>()
  for (const msg of recentMessages ?? []) {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg)
    }
  }

  // Build response
  const result = (conversations ?? []).map(conv => {
    const membership = membershipMap.get(conv.id)
    const members = (allMembers ?? [])
      .filter(m => m.conversation_id === conv.id)
      .map(m => ({
        user_id: m.user_id,
        role: m.role,
        display_name: profileMap.get(m.user_id)?.display_name ?? null,
        avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
      }))
    const lastMessage = lastMessageMap.get(conv.id) ?? null
    const unread = membership ? conv.updated_at > membership.last_read_at : false

    return {
      ...conv,
      my_role: membership?.role ?? 'member',
      last_read_at: membership?.last_read_at ?? conv.created_at,
      unread,
      last_message: lastMessage,
      members,
    }
  })

  return NextResponse.json({ conversations: result })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, targetUserId, name, description, memberIds } = body

  if (type === 'direct') {
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

    // Check for existing DM
    const { data: myMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    const myConvIds = myMemberships?.map(m => m.conversation_id) ?? []

    if (myConvIds.length > 0) {
      const { data: directConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'direct')
        .in('id', myConvIds)

      const directIds = directConvs?.map(c => c.id) ?? []

      if (directIds.length > 0) {
        const { data: targetMem } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', directIds)

        if (targetMem && targetMem.length > 0) {
          return NextResponse.json({ conversation: { id: targetMem[0].conversation_id }, existing: true })
        }
      }
    }

    // Create new DM
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'direct', created_by: user.id })
      .select()
      .single()

    if (convErr || !conv) return NextResponse.json({ error: 'Failed to create' }, { status: 500 })

    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id, role: 'admin' },
      { conversation_id: conv.id, user_id: targetUserId, role: 'member' },
    ])

    return NextResponse.json({ conversation: conv }, { status: 201 })
  }

  if (type === 'group') {
    if (!name?.trim()) return NextResponse.json({ error: 'Group name required' }, { status: 400 })

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'group', name: name.trim(), description: description ?? null, created_by: user.id })
      .select()
      .single()

    if (convErr || !conv) return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })

    const members = [
      { conversation_id: conv.id, user_id: user.id, role: 'admin' as const },
      ...((memberIds as string[]) ?? []).map(uid => ({
        conversation_id: conv.id,
        user_id: uid,
        role: 'member' as const,
      })),
    ]

    await supabase.from('conversation_members').insert(members)

    // Insert system message
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      type: 'system',
      content: 'Group created',
      sender_id: null,
    })

    return NextResponse.json({ conversation: conv }, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
