import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify membership
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const before = url.searchParams.get('before')
  const limit = 50

  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, type, file_url, file_name, file_size, mime_type, created_at, deleted_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data: messages, error } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const hasMore = (messages?.length ?? 0) > limit
  const pageMessages = hasMore ? messages!.slice(0, limit) : (messages ?? [])

  // Get sender profiles
  const senderIds = [...new Set(pageMessages.filter(m => m.sender_id).map(m => m.sender_id!))]
  const { data: profiles } = senderIds.length > 0
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', senderIds)
    : { data: [] }

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  const enriched = pageMessages.reverse().map(m => ({
    ...m,
    sender_display_name: m.sender_id ? (profileMap.get(m.sender_id)?.display_name ?? null) : null,
    sender_avatar_url: m.sender_id ? (profileMap.get(m.sender_id)?.avatar_url ?? null) : null,
  }))

  // Bump last_read_at
  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ messages: enriched, hasMore })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify membership
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('id')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { content, type = 'text', file_url, file_name, file_size, mime_type } = body

  if (!content?.trim() && !file_url) {
    return NextResponse.json({ error: 'Content or file required' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: id,
      sender_id: user.id,
      content: content?.trim() ?? null,
      type,
      file_url: file_url ?? null,
      file_name: file_name ?? null,
      file_size: file_size ?? null,
      mime_type: mime_type ?? null,
    })
    .select()
    .single()

  if (error || !message) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })

  // Get sender profile for response
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    message: {
      ...message,
      sender_display_name: profile?.display_name ?? null,
      sender_avatar_url: profile?.avatar_url ?? null,
    }
  }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const messageId = url.searchParams.get('messageId')
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString(), content: null })
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })

  return NextResponse.json({ success: true })
}
