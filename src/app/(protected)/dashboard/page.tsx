import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, is_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_admin) redirect('/admin')

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
            Settings
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm text-red-600 hover:text-red-800">
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}!
          </h2>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Push Notifications</h3>
            <p className="text-sm text-gray-500 mb-3">Manage your notification preferences.</p>
            <Link href="/settings" className="text-sm text-indigo-600 font-medium hover:underline">
              Configure →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Realtime</h3>
            <p className="text-sm text-gray-500 mb-3">Live data updates via Supabase.</p>
            <span className="text-sm text-green-600 font-medium">Active</span>
          </div>

          {profile?.is_admin && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Admin</h3>
              <p className="text-sm text-gray-500 mb-3">Send push notifications to users.</p>
              <Link href="/admin" className="text-sm text-amber-600 font-medium hover:underline">
                Open Dashboard →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
