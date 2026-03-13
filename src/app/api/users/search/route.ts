import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()

  if (!q || q.length < 2) return NextResponse.json({ users: [] })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${q}%`)
    .neq('id', user.id)
    .limit(20)

  if (error) return NextResponse.json({ error: 'Failed to search' }, { status: 500 })

  return NextResponse.json({ users: data ?? [] })
}
