'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'
import Link from 'next/link'

export default function SettingsPage() {
  const {
    isSupported,
    isIOS,
    isStandalone,
    iosVersion,
    permissionState,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const renderNotificationSection = () => {
    if (!isSupported) {
      return (
        <p className="text-sm text-gray-500">
          Push notifications are not supported in this browser.
        </p>
      )
    }

    if (isIOS && !isStandalone) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium mb-1">Install required for iOS</p>
          <p className="text-sm text-amber-700">
            To enable push notifications on iOS, you must add this app to your Home Screen first.
            Tap the Share button in Safari, then select &ldquo;Add to Home Screen&rdquo;.
          </p>
        </div>
      )
    }

    if (isIOS && iosVersion > 0 && iosVersion < 16) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Push notifications require iOS 16.4 or later. Your device is running iOS {iosVersion}.
          </p>
        </div>
      )
    }

    if (permissionState === 'denied') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium mb-1">Notifications blocked</p>
          <p className="text-sm text-red-700">
            You&apos;ve blocked notifications for this app. To re-enable, go to your device&apos;s
            Settings → Notifications and allow notifications for this app.
          </p>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">
            {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
          </p>
          <p className="text-sm text-gray-500">
            {isSubscribed
              ? 'You will receive push notifications on this device.'
              : 'Enable to receive push notifications on this device.'}
          </p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isSubscribed
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isLoading
            ? '…'
            : isSubscribed
            ? 'Disable'
            : 'Enable'}
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
          ← Dashboard
        </Link>
        <h1 className="font-bold text-gray-900">Settings</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Push Notifications */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Push Notifications</h2>
          <p className="text-sm text-gray-500 mb-4">
            Receive real-time alerts even when the app is in the background.
          </p>
          {renderNotificationSection()}
        </section>

        {/* PWA Info */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">App Info</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Platform</dt>
              <dd className="text-gray-900">{isIOS ? 'iOS' : 'Other'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Standalone mode</dt>
              <dd className={isStandalone ? 'text-green-600 font-medium' : 'text-gray-900'}>
                {isStandalone ? 'Yes (PWA)' : 'No (browser)'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Push supported</dt>
              <dd className={isSupported ? 'text-green-600 font-medium' : 'text-red-600'}>
                {isSupported ? 'Yes' : 'No'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Permission</dt>
              <dd className="text-gray-900">{permissionState}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  )
}
