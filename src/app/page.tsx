import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/messages')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Messaging</h1>
        <p className="text-gray-600 mb-8">
          Real-time messaging with file sharing, group chats, and push notifications.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="border border-indigo-600 text-indigo-600 py-3 px-6 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  )
}
