import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 52428800) return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'application/pdf', 'text/plain', 'application/zip',
  ]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user.id}/${Date.now()}_${safeName}`

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error || !data) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(data.path)

  const msgType = file.type.startsWith('image/') ? 'image' : 'file'

  return NextResponse.json({
    url: publicUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    type: msgType,
  }, { status: 201 })
}
