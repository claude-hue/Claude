'use client'

import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { InstallPrompt } from './InstallPrompt'

/**
 * Client component placed in the root layout.
 * Handles service worker registration and push subscription lifecycle.
 * Shows appropriate UI based on the user's platform and permission state.
 */
export function PushNotificationManager() {
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

  // Register the service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('Service worker registration failed:', err))
    }
  }, [])

  // Push not supported at all
  if (!isSupported) return null

  // iOS: not in standalone mode — guide user to add to Home Screen
  if (isIOS && !isStandalone) {
    return <InstallPrompt showIOSGuide />
  }

  // iOS: old version — push not supported
  if (isIOS && iosVersion > 0 && iosVersion < 16) {
    return (
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-xl p-4 z-40">
        <p className="text-sm text-amber-800">
          Push notifications require iOS 16.4 or later. Please update your device.
        </p>
      </div>
    )
  }

  // Already subscribed — nothing to show (handled by settings page)
  if (isSubscribed) return null

  // Permission denied — inform user
  if (permissionState === 'denied') return null

  // Default state — show opt-in button (shown on the settings page, not here globally)
  // The global manager just handles SW registration + iOS detection
  // Actual subscribe UI is in the settings page
  void subscribe
  void unsubscribe
  void isLoading
  void error

  return null
}
