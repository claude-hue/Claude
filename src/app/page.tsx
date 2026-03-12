import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white text-3xl font-bold">P</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">PWA Supabase App</h1>
        <p className="text-gray-600 mb-8">
          A progressive web app with real-time data, cloud storage, and push notifications — including iOS.
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
